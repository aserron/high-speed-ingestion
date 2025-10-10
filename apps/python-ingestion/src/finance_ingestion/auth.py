"""
Authentication and Authorization

Production authentication and authorization middleware for the Python
financial data ingestion system. Supports API keys, JWT tokens, and basic auth.
"""

import asyncio
import hashlib
import hmac
import time
import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from functools import wraps
from dataclasses import dataclass

from aiohttp import web, hdrs
from aiohttp.web_request import Request
from aiohttp.web_response import Response

from .config import get_config
from .logging import get_logger


@dataclass
class AuthContext:
    """Authentication context for requests"""
    authenticated: bool = False
    user_id: Optional[str] = None
    auth_method: Optional[str] = None
    permissions: List[str] = None
    api_key: Optional[str] = None
    jwt_claims: Optional[Dict[str, Any]] = None


class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self, requests_per_minute: int = 1000, burst_size: int = 100):
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        self.clients = {}  # client_id -> (request_count, window_start, burst_tokens)
        self.window_size = 60  # 1 minute
    
    def is_allowed(self, client_id: str) -> bool:
        """Check if request is allowed for client"""
        now = time.time()
        
        if client_id not in self.clients:
            self.clients[client_id] = (1, now, self.burst_size - 1)
            return True
        
        request_count, window_start, burst_tokens = self.clients[client_id]
        
        # Reset window if expired
        if now - window_start >= self.window_size:
            self.clients[client_id] = (1, now, self.burst_size - 1)
            return True
        
        # Check burst tokens first
        if burst_tokens > 0:
            self.clients[client_id] = (request_count + 1, window_start, burst_tokens - 1)
            return True
        
        # Check rate limit
        if request_count < self.requests_per_minute:
            self.clients[client_id] = (request_count + 1, window_start, burst_tokens)
            return True
        
        return False
    
    def cleanup_expired(self):
        """Clean up expired client entries"""
        now = time.time()
        expired_clients = [
            client_id for client_id, (_, window_start, _) in self.clients.items()
            if now - window_start >= self.window_size * 2
        ]
        
        for client_id in expired_clients:
            del self.clients[client_id]


class AuthenticationManager:
    """Authentication manager for production use"""
    
    def __init__(self):
        self.config = get_config()
        self.logger = get_logger(__name__)
        
        # Load authentication configuration
        try:
            from ..config.production import get_production_config
            self.prod_config = get_production_config()
            self.auth_config = self.prod_config.auth_config
        except ImportError:
            self.logger.warning("Production config not available, using default settings")
            self.auth_config = None
        
        # Initialize rate limiter
        if self.auth_config and self.auth_config.rate_limit_enabled:
            self.rate_limiter = RateLimiter(
                self.auth_config.rate_limit_requests_per_minute,
                self.auth_config.rate_limit_burst_size
            )
        else:
            self.rate_limiter = None
        
        # Start cleanup task for rate limiter
        if self.rate_limiter:
            asyncio.create_task(self._cleanup_rate_limiter())
    
    async def _cleanup_rate_limiter(self):
        """Periodic cleanup of rate limiter"""
        while True:
            try:
                await asyncio.sleep(300)  # Clean up every 5 minutes
                if self.rate_limiter:
                    self.rate_limiter.cleanup_expired()
            except Exception as e:
                self.logger.error(f"Error in rate limiter cleanup: {e}")
    
    def get_client_id(self, request: Request) -> str:
        """Get client identifier for rate limiting"""
        # Try to get client ID from various sources
        client_id = request.headers.get('X-Client-ID')
        if client_id:
            return client_id
        
        # Use API key if available
        api_key = self.extract_api_key(request)
        if api_key:
            return f"api_key:{api_key[:8]}"
        
        # Use IP address as fallback
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            return f"ip:{forwarded_for.split(',')[0].strip()}"
        
        return f"ip:{request.remote}"
    
    def extract_api_key(self, request: Request) -> Optional[str]:
        """Extract API key from request"""
        if not self.auth_config or not self.auth_config.api_key_enabled:
            return None
        
        # Check header
        api_key = request.headers.get(self.auth_config.api_key_header)
        if api_key:
            return api_key
        
        # Check query parameter
        api_key = request.query.get('api_key')
        if api_key:
            return api_key
        
        return None
    
    def validate_api_key(self, api_key: str) -> bool:
        """Validate API key"""
        if not self.auth_config or not self.auth_config.api_key_enabled:
            return False
        
        return api_key in self.auth_config.api_keys
    
    def extract_jwt_token(self, request: Request) -> Optional[str]:
        """Extract JWT token from request"""
        if not self.auth_config or not self.auth_config.jwt_enabled:
            return None
        
        # Check Authorization header
        auth_header = request.headers.get(hdrs.AUTHORIZATION)
        if auth_header and auth_header.startswith('Bearer '):
            return auth_header[7:]  # Remove 'Bearer ' prefix
        
        # Check cookie
        token = request.cookies.get('jwt_token')
        if token:
            return token
        
        return None
    
    def validate_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate JWT token and return claims"""
        if not self.auth_config or not self.auth_config.jwt_enabled:
            return None
        
        try:
            claims = jwt.decode(
                token,
                self.auth_config.jwt_secret_key,
                algorithms=[self.auth_config.jwt_algorithm],
                issuer=self.auth_config.jwt_issuer
            )
            
            # Check expiration
            if 'exp' in claims and claims['exp'] < time.time():
                return None
            
            return claims
            
        except jwt.InvalidTokenError as e:
            self.logger.warning(f"Invalid JWT token: {e}")
            return None
    
    def extract_basic_auth(self, request: Request) -> Optional[tuple]:
        """Extract basic authentication credentials"""
        if not self.auth_config or not self.auth_config.basic_auth_enabled:
            return None
        
        auth_header = request.headers.get(hdrs.AUTHORIZATION)
        if not auth_header or not auth_header.startswith('Basic '):
            return None
        
        try:
            import base64
            encoded_credentials = auth_header[6:]  # Remove 'Basic ' prefix
            decoded_credentials = base64.b64decode(encoded_credentials).decode('utf-8')
            username, password = decoded_credentials.split(':', 1)
            return username, password
        except Exception as e:
            self.logger.warning(f"Invalid basic auth header: {e}")
            return None
    
    def validate_basic_auth(self, username: str, password: str) -> bool:
        """Validate basic authentication credentials"""
        if not self.auth_config or not self.auth_config.basic_auth_enabled:
            return False
        
        # Check username
        if username != self.auth_config.admin_username:
            return False
        
        # Check password hash
        if not self.auth_config.admin_password_hash:
            return False
        
        try:
            return bcrypt.checkpw(
                password.encode('utf-8'),
                self.auth_config.admin_password_hash.encode('utf-8')
            )
        except Exception as e:
            self.logger.warning(f"Error validating password: {e}")
            return False
    
    async def authenticate_request(self, request: Request) -> AuthContext:
        """Authenticate incoming request"""
        auth_context = AuthContext()
        
        # Check rate limiting first
        if self.rate_limiter:
            client_id = self.get_client_id(request)
            if not self.rate_limiter.is_allowed(client_id):
                self.logger.warning(f"Rate limit exceeded for client: {client_id}")
                raise web.HTTPTooManyRequests(text="Rate limit exceeded")
        
        # Try API key authentication
        api_key = self.extract_api_key(request)
        if api_key and self.validate_api_key(api_key):
            auth_context.authenticated = True
            auth_context.auth_method = "api_key"
            auth_context.api_key = api_key
            auth_context.user_id = f"api_key:{api_key[:8]}"
            auth_context.permissions = ["read", "write"]
            return auth_context
        
        # Try JWT authentication
        jwt_token = self.extract_jwt_token(request)
        if jwt_token:
            jwt_claims = self.validate_jwt_token(jwt_token)
            if jwt_claims:
                auth_context.authenticated = True
                auth_context.auth_method = "jwt"
                auth_context.jwt_claims = jwt_claims
                auth_context.user_id = jwt_claims.get('sub', 'unknown')
                auth_context.permissions = jwt_claims.get('permissions', [])
                return auth_context
        
        # Try basic authentication
        basic_auth = self.extract_basic_auth(request)
        if basic_auth:
            username, password = basic_auth
            if self.validate_basic_auth(username, password):
                auth_context.authenticated = True
                auth_context.auth_method = "basic"
                auth_context.user_id = username
                auth_context.permissions = ["admin", "read", "write"]
                return auth_context
        
        # No valid authentication found
        return auth_context


# Global authentication manager instance
_auth_manager = None


def get_auth_manager() -> AuthenticationManager:
    """Get global authentication manager instance"""
    global _auth_manager
    if _auth_manager is None:
        _auth_manager = AuthenticationManager()
    return _auth_manager


def require_auth(permissions: List[str] = None):
    """Decorator to require authentication for endpoints"""
    def decorator(handler):
        @wraps(handler)
        async def wrapper(request: Request) -> Response:
            auth_manager = get_auth_manager()
            
            try:
                auth_context = await auth_manager.authenticate_request(request)
                
                if not auth_context.authenticated:
                    return web.Response(
                        status=401,
                        text="Authentication required",
                        headers={'WWW-Authenticate': 'Bearer, Basic'}
                    )
                
                # Check permissions if specified
                if permissions:
                    user_permissions = auth_context.permissions or []
                    if not any(perm in user_permissions for perm in permissions):
                        return web.Response(
                            status=403,
                            text="Insufficient permissions"
                        )
                
                # Add auth context to request
                request['auth_context'] = auth_context
                
                # Call the original handler
                return await handler(request)
                
            except web.HTTPException:
                raise
            except Exception as e:
                auth_manager.logger.error(f"Authentication error: {e}")
                return web.Response(status=500, text="Internal server error")
        
        return wrapper
    return decorator


def require_admin():
    """Decorator to require admin permissions"""
    return require_auth(permissions=["admin"])


async def auth_middleware(request: Request, handler: Callable) -> Response:
    """Authentication middleware for aiohttp"""
    # Skip authentication for health check and metrics endpoints
    if request.path in ['/health', '/metrics', '/ready']:
        return await handler(request)
    
    # Skip authentication if not configured
    auth_manager = get_auth_manager()
    if not auth_manager.auth_config:
        return await handler(request)
    
    try:
        # Authenticate request
        auth_context = await auth_manager.authenticate_request(request)
        request['auth_context'] = auth_context
        
        # Continue to handler
        return await handler(request)
        
    except web.HTTPException:
        raise
    except Exception as e:
        auth_manager.logger.error(f"Authentication middleware error: {e}")
        return web.Response(status=500, text="Internal server error")


def generate_jwt_token(user_id: str, permissions: List[str] = None, 
                      expiration_hours: int = 24) -> str:
    """Generate JWT token for user"""
    auth_manager = get_auth_manager()
    
    if not auth_manager.auth_config or not auth_manager.auth_config.jwt_enabled:
        raise ValueError("JWT authentication not enabled")
    
    now = datetime.utcnow()
    claims = {
        'iss': auth_manager.auth_config.jwt_issuer,
        'sub': user_id,
        'iat': now,
        'exp': now + timedelta(hours=expiration_hours),
        'permissions': permissions or []
    }
    
    return jwt.encode(
        claims,
        auth_manager.auth_config.jwt_secret_key,
        algorithm=auth_manager.auth_config.jwt_algorithm
    )


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


if __name__ == "__main__":
    # CLI for password hashing
    import sys
    
    if len(sys.argv) > 1:
        password = sys.argv[1]
        hashed = hash_password(password)
        print(f"Password hash: {hashed}")
    else:
        print("Usage: python auth.py <password>")
        print("Generates bcrypt hash for the given password")