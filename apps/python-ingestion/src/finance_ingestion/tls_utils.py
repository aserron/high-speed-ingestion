"""
TLS/SSL Utilities

Production TLS/SSL configuration and utilities for secure WebSocket connections
and HTTPS endpoints in the Python financial data ingestion system.
"""

import ssl
import os
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass

import websockets
from aiohttp import web, ClientSession, TCPConnector


@dataclass
class TLSCertificateInfo:
    """TLS certificate information"""
    subject: str
    issuer: str
    serial_number: str
    not_before: str
    not_after: str
    fingerprint: str
    is_valid: bool
    days_until_expiry: int


class TLSManager:
    """TLS/SSL configuration manager"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Load TLS configuration
        try:
            from ..config.production import get_production_config
            self.prod_config = get_production_config()
            self.tls_config = self.prod_config.tls_config
        except ImportError:
            self.logger.warning("Production config not available, TLS disabled")
            self.tls_config = None
    
    def create_server_ssl_context(self) -> Optional[ssl.SSLContext]:
        """Create SSL context for server use (HTTPS endpoints)"""
        if not self.tls_config or not self.tls_config.tls_enabled:
            return None
        
        try:
            return self.tls_config.create_ssl_context()
        except Exception as e:
            self.logger.error(f"Failed to create server SSL context: {e}")
            return None
    
    def create_client_ssl_context(self, verify_ssl: bool = True) -> Optional[ssl.SSLContext]:
        """Create SSL context for client use (WebSocket connections)"""
        if not self.tls_config or not self.tls_config.websocket_tls_enabled:
            return None
        
        try:
            # Create client SSL context
            if self.tls_config.ssl_protocol == "TLSv1_3":
                context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
                context.minimum_version = ssl.TLSVersion.TLSv1_3
            else:
                context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
                context.minimum_version = ssl.TLSVersion.TLSv1_2
            
            # Configure verification
            if verify_ssl and self.tls_config.websocket_verify_ssl:
                context.check_hostname = True
                context.verify_mode = ssl.CERT_REQUIRED
                
                # Load CA certificates
                if self.tls_config.tls_ca_file and os.path.exists(self.tls_config.tls_ca_file):
                    context.load_verify_locations(self.tls_config.tls_ca_file)
                else:
                    context.load_default_certs()
            else:
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE
            
            # Set cipher suites
            context.set_ciphers(self.tls_config.ssl_ciphers)
            
            return context
            
        except Exception as e:
            self.logger.error(f"Failed to create client SSL context: {e}")
            return None
    
    def get_certificate_info(self, cert_file: str) -> Optional[TLSCertificateInfo]:
        """Get information about a TLS certificate"""
        if not os.path.exists(cert_file):
            return None
        
        try:
            import cryptography.x509
            from cryptography.hazmat.backends import default_backend
            from datetime import datetime
            
            with open(cert_file, 'rb') as f:
                cert_data = f.read()
            
            cert = cryptography.x509.load_pem_x509_certificate(cert_data, default_backend())
            
            # Extract certificate information
            subject = cert.subject.rfc4514_string()
            issuer = cert.issuer.rfc4514_string()
            serial_number = str(cert.serial_number)
            not_before = cert.not_valid_before.isoformat()
            not_after = cert.not_valid_after.isoformat()
            
            # Calculate fingerprint
            fingerprint = cert.fingerprint(cryptography.hazmat.primitives.hashes.SHA256()).hex()
            
            # Check validity
            now = datetime.utcnow()
            is_valid = cert.not_valid_before <= now <= cert.not_valid_after
            
            # Days until expiry
            days_until_expiry = (cert.not_valid_after - now).days
            
            return TLSCertificateInfo(
                subject=subject,
                issuer=issuer,
                serial_number=serial_number,
                not_before=not_before,
                not_after=not_after,
                fingerprint=fingerprint,
                is_valid=is_valid,
                days_until_expiry=days_until_expiry
            )
            
        except Exception as e:
            self.logger.error(f"Failed to read certificate info: {e}")
            return None
    
    def validate_tls_configuration(self) -> Dict[str, Any]:
        """Validate TLS configuration and return status"""
        if not self.tls_config:
            return {
                "enabled": False,
                "status": "disabled",
                "message": "TLS configuration not available"
            }
        
        if not self.tls_config.tls_enabled:
            return {
                "enabled": False,
                "status": "disabled",
                "message": "TLS explicitly disabled"
            }
        
        issues = []
        warnings = []
        
        # Check certificate files
        if not os.path.exists(self.tls_config.tls_cert_file):
            issues.append(f"Certificate file not found: {self.tls_config.tls_cert_file}")
        else:
            cert_info = self.get_certificate_info(self.tls_config.tls_cert_file)
            if cert_info:
                if not cert_info.is_valid:
                    issues.append("Certificate is not valid (expired or not yet valid)")
                elif cert_info.days_until_expiry < 30:
                    warnings.append(f"Certificate expires in {cert_info.days_until_expiry} days")
        
        if not os.path.exists(self.tls_config.tls_key_file):
            issues.append(f"Private key file not found: {self.tls_config.tls_key_file}")
        
        # Check CA file if specified
        if self.tls_config.tls_ca_file and not os.path.exists(self.tls_config.tls_ca_file):
            issues.append(f"CA file not found: {self.tls_config.tls_ca_file}")
        
        # Try to create SSL context
        try:
            context = self.create_server_ssl_context()
            if context is None:
                issues.append("Failed to create SSL context")
        except Exception as e:
            issues.append(f"SSL context creation failed: {e}")
        
        # Determine status
        if issues:
            status = "error"
            message = f"TLS configuration has {len(issues)} error(s)"
        elif warnings:
            status = "warning"
            message = f"TLS configuration has {len(warnings)} warning(s)"
        else:
            status = "ok"
            message = "TLS configuration is valid"
        
        return {
            "enabled": True,
            "status": status,
            "message": message,
            "issues": issues,
            "warnings": warnings,
            "certificate_info": self.get_certificate_info(self.tls_config.tls_cert_file) if os.path.exists(self.tls_config.tls_cert_file) else None
        }
    
    async def create_secure_websocket_connection(self, uri: str, **kwargs) -> websockets.WebSocketClientProtocol:
        """Create secure WebSocket connection with proper TLS configuration"""
        ssl_context = self.create_client_ssl_context()
        
        # Add SSL context to connection parameters
        if ssl_context and uri.startswith('wss://'):
            kwargs['ssl'] = ssl_context
        
        # Add additional security headers
        extra_headers = kwargs.get('extra_headers', {})
        extra_headers.update({
            'User-Agent': 'FinanceIngestion/1.0',
            'X-Client-Version': '1.0.0'
        })
        kwargs['extra_headers'] = extra_headers
        
        try:
            return await websockets.connect(uri, **kwargs)
        except Exception as e:
            self.logger.error(f"Failed to create secure WebSocket connection: {e}")
            raise
    
    def create_secure_http_client(self, verify_ssl: bool = True) -> ClientSession:
        """Create secure HTTP client with proper TLS configuration"""
        ssl_context = self.create_client_ssl_context(verify_ssl)
        
        # Create TCP connector with SSL context
        connector = TCPConnector(
            ssl=ssl_context,
            limit=100,
            limit_per_host=30,
            ttl_dns_cache=300,
            use_dns_cache=True
        )
        
        # Create client session
        return ClientSession(
            connector=connector,
            timeout=web.ClientTimeout(total=30),
            headers={
                'User-Agent': 'FinanceIngestion/1.0',
                'X-Client-Version': '1.0.0'
            }
        )


# Global TLS manager instance
_tls_manager = None


def get_tls_manager() -> TLSManager:
    """Get global TLS manager instance"""
    global _tls_manager
    if _tls_manager is None:
        _tls_manager = TLSManager()
    return _tls_manager


def create_secure_aiohttp_app(app: web.Application) -> web.Application:
    """Configure aiohttp application with security middleware"""
    tls_manager = get_tls_manager()
    
    if not tls_manager.tls_config:
        return app
    
    @web.middleware
    async def security_middleware(request, handler):
        """Add security headers to responses"""
        response = await handler(request)
        
        # Add security headers
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': "default-src 'self'",
            'X-Permitted-Cross-Domain-Policies': 'none'
        }
        
        # Add HSTS header for HTTPS
        if request.scheme == 'https':
            security_headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        for header, value in security_headers.items():
            response.headers[header] = value
        
        return response
    
    # Add security middleware
    app.middlewares.append(security_middleware)
    
    return app


def generate_self_signed_certificate(cert_file: str, key_file: str, 
                                   common_name: str = "localhost",
                                   days_valid: int = 365) -> bool:
    """Generate self-signed certificate for development/testing"""
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from datetime import datetime, timedelta
        
        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        
        # Create certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "CA"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "San Francisco"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Finance Ingestion"),
            x509.NameAttribute(NameOID.COMMON_NAME, common_name),
        ])
        
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.utcnow()
        ).not_valid_after(
            datetime.utcnow() + timedelta(days=days_valid)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName(common_name),
                x509.DNSName("localhost"),
                x509.IPAddress("127.0.0.1"),
            ]),
            critical=False,
        ).sign(private_key, hashes.SHA256())
        
        # Write certificate
        with open(cert_file, "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
        
        # Write private key
        with open(key_file, "wb") as f:
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ))
        
        # Set appropriate permissions
        os.chmod(key_file, 0o600)
        os.chmod(cert_file, 0o644)
        
        return True
        
    except Exception as e:
        logging.getLogger(__name__).error(f"Failed to generate self-signed certificate: {e}")
        return False


if __name__ == "__main__":
    # CLI for TLS utilities
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python tls_utils.py validate - Validate TLS configuration")
        print("  python tls_utils.py generate <cert_file> <key_file> [common_name] - Generate self-signed certificate")
        print("  python tls_utils.py info <cert_file> - Show certificate information")
        sys.exit(1)
    
    command = sys.argv[1]
    tls_manager = get_tls_manager()
    
    if command == "validate":
        status = tls_manager.validate_tls_configuration()
        print(json.dumps(status, indent=2, default=str))
    
    elif command == "generate" and len(sys.argv) >= 4:
        cert_file = sys.argv[2]
        key_file = sys.argv[3]
        common_name = sys.argv[4] if len(sys.argv) > 4 else "localhost"
        
        if generate_self_signed_certificate(cert_file, key_file, common_name):
            print(f"Self-signed certificate generated:")
            print(f"  Certificate: {cert_file}")
            print(f"  Private key: {key_file}")
            print(f"  Common name: {common_name}")
        else:
            print("Failed to generate certificate")
            sys.exit(1)
    
    elif command == "info" and len(sys.argv) >= 3:
        cert_file = sys.argv[2]
        cert_info = tls_manager.get_certificate_info(cert_file)
        
        if cert_info:
            print(json.dumps(cert_info.__dict__, indent=2, default=str))
        else:
            print(f"Failed to read certificate: {cert_file}")
            sys.exit(1)
    
    else:
        print("Invalid command or missing arguments")
        sys.exit(1)