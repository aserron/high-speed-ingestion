"""
REST API Endpoints for Financial Data Ingestion

Provides health checks, metrics endpoints, and real-time performance statistics
with OpenAPI 3.0 specification documentation for monitoring and observability.
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional
import logging

try:
    from fastapi import FastAPI, HTTPException, Response, Depends
    from fastapi.responses import JSONResponse, PlainTextResponse
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.openapi.utils import get_openapi
    import uvicorn
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    # Mock classes for when FastAPI is not available
    class FastAPI:
        def __init__(self, *args, **kwargs): pass
        def get(self, *args, **kwargs): return lambda f: f
        def post(self, *args, **kwargs): return lambda f: f
        def add_middleware(self, *args, **kwargs): pass
    
    class HTTPException(Exception): pass
    class Response: pass
    class JSONResponse: pass
    class PlainTextResponse: pass
    class CORSMiddleware: pass
    def Depends(*args): return lambda f: f
    def get_openapi(*args, **kwargs): return {}
    uvicorn = None

from .metrics import get_metrics_collector, get_structured_logger
from .storage.storage_manager import StorageManager
from .config import get_config


class HealthStatus:
    """Health status enumeration"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"


class APIServer:
    """REST API server for financial data ingestion system"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or get_config()
        self.logger = get_structured_logger('api-server')
        self.metrics_collector = get_metrics_collector(self.config.get('metrics', {}))
        
        # Storage manager reference (will be injected)
        self.storage_manager: Optional[StorageManager] = None
        
        # API server instance
        self.app = None
        self.server = None
        
        # Initialize FastAPI app
        self._init_fastapi_app()
        
    def _init_fastapi_app(self):
        """Initialize FastAPI application"""
        if not FASTAPI_AVAILABLE:
            self.logger.error("FastAPI not available, REST API will be disabled")
            return
            
        self.app = FastAPI(
            title="Financial Data Ingestion API",
            description="High-performance financial market data ingestion system",
            version="1.0.0",
            docs_url="/docs",
            redoc_url="/redoc",
            openapi_url="/openapi.json"
        )
        
        # Add CORS middleware
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Register routes
        self._register_routes()
        
        # Customize OpenAPI schema
        self._customize_openapi()
        
    def _register_routes(self):
        """Register API routes"""
        
        @self.app.get("/health", 
                     response_model=Dict[str, Any],
                     summary="Health Check",
                     description="Check the health status of the ingestion system")
        async def health_check():
            """Health check endpoint"""
            return await self._health_check()
            
        @self.app.get("/metrics",
                     response_class=PlainTextResponse,
                     summary="Prometheus Metrics",
                     description="Export metrics in Prometheus format")
        async def metrics():
            """Prometheus metrics endpoint"""
            return await self._get_prometheus_metrics()
            
        @self.app.get("/stats",
                     response_model=Dict[str, Any],
                     summary="Performance Statistics",
                     description="Get real-time performance statistics")
        async def stats():
            """Performance statistics endpoint"""
            return await self._get_performance_stats()
            
        @self.app.get("/stats/latency",
                     response_model=Dict[str, Any],
                     summary="Latency Statistics",
                     description="Get detailed latency statistics")
        async def latency_stats():
            """Latency statistics endpoint"""
            return await self._get_latency_stats()
            
        @self.app.get("/stats/throughput",
                     response_model=Dict[str, Any],
                     summary="Throughput Statistics", 
                     description="Get throughput and processing statistics")
        async def throughput_stats():
            """Throughput statistics endpoint"""
            return await self._get_throughput_stats()
            
        @self.app.get("/stats/storage",
                     response_model=Dict[str, Any],
                     summary="Storage Statistics",
                     description="Get storage layer performance statistics")
        async def storage_stats():
            """Storage statistics endpoint"""
            return await self._get_storage_stats()
            
        @self.app.get("/config",
                     response_model=Dict[str, Any],
                     summary="Configuration",
                     description="Get current system configuration (sanitized)")
        async def get_configuration():
            """Configuration endpoint"""
            return await self._get_sanitized_config()
            
        @self.app.post("/config/reload",
                      response_model=Dict[str, Any],
                      summary="Reload Configuration",
                      description="Reload system configuration")
        async def reload_configuration():
            """Configuration reload endpoint"""
            return await self._reload_config()
    
    def _customize_openapi(self):
        """Customize OpenAPI schema"""
        def custom_openapi():
            if self.app.openapi_schema:
                return self.app.openapi_schema
                
            openapi_schema = get_openapi(
                title="Financial Data Ingestion API",
                version="1.0.0",
                description="""
                High-performance financial market data ingestion system API.
                
                This API provides endpoints for monitoring system health, retrieving performance metrics,
                and accessing real-time statistics for the financial data ingestion pipeline.
                
                ## Features
                - Health monitoring with detailed component status
                - Prometheus-compatible metrics export
                - Real-time performance statistics
                - Latency and throughput analytics
                - Storage layer monitoring
                - Configuration management
                
                ## Authentication
                Currently no authentication is required for monitoring endpoints.
                Production deployments should implement appropriate security measures.
                """,
                routes=self.app.routes,
            )
            
            # Add custom tags
            openapi_schema["tags"] = [
                {
                    "name": "health",
                    "description": "System health and status monitoring"
                },
                {
                    "name": "metrics", 
                    "description": "Performance metrics and monitoring"
                },
                {
                    "name": "statistics",
                    "description": "Real-time performance statistics"
                },
                {
                    "name": "configuration",
                    "description": "System configuration management"
                }
            ]
            
            self.app.openapi_schema = openapi_schema
            return self.app.openapi_schema
            
        self.app.openapi = custom_openapi
    
    async def _health_check(self) -> Dict[str, Any]:
        """Perform comprehensive health check"""
        start_time = time.perf_counter()
        
        health_data = {
            "status": HealthStatus.HEALTHY,
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "uptime_seconds": time.time() - getattr(self, '_start_time', time.time()),
            "components": {}
        }
        
        overall_healthy = True
        
        # Check metrics collector
        try:
            metrics_stats = self.metrics_collector.get_all_stats()
            health_data["components"]["metrics"] = {
                "status": HealthStatus.HEALTHY,
                "active_correlation_ids": metrics_stats.get("correlation_ids_active", 0),
                "latency_stats_count": len(metrics_stats.get("latency", {}))
            }
        except Exception as e:
            health_data["components"]["metrics"] = {
                "status": HealthStatus.UNHEALTHY,
                "error": str(e)
            }
            overall_healthy = False
        
        # Check storage manager
        if self.storage_manager:
            try:
                storage_metrics = self.storage_manager.get_metrics()
                health_data["components"]["storage"] = {
                    "status": HealthStatus.HEALTHY,
                    "redis_writes": storage_metrics.get("redis_writes", 0),
                    "postgres_writes": storage_metrics.get("postgres_writes", 0),
                    "buffer_size": storage_metrics.get("buffer_size", 0),
                    "errors": storage_metrics.get("errors", 0)
                }
                
                # Mark as degraded if there are errors
                if storage_metrics.get("errors", 0) > 0:
                    health_data["components"]["storage"]["status"] = HealthStatus.DEGRADED
                    
            except Exception as e:
                health_data["components"]["storage"] = {
                    "status": HealthStatus.UNHEALTHY,
                    "error": str(e)
                }
                overall_healthy = False
        else:
            health_data["components"]["storage"] = {
                "status": HealthStatus.UNHEALTHY,
                "error": "Storage manager not initialized"
            }
            overall_healthy = False
        
        # Set overall status
        if not overall_healthy:
            health_data["status"] = HealthStatus.UNHEALTHY
        elif any(comp.get("status") == HealthStatus.DEGRADED 
                for comp in health_data["components"].values()):
            health_data["status"] = HealthStatus.DEGRADED
        
        # Add response time
        health_data["response_time_ms"] = (time.perf_counter() - start_time) * 1000
        
        # Track health check metrics
        self.metrics_collector.increment_counter("api_health_checks_total", 
                                                labels={"status": health_data["status"]})
        
        return health_data
    
    async def _get_prometheus_metrics(self) -> str:
        """Get Prometheus metrics"""
        try:
            metrics_data = self.metrics_collector.export_prometheus_metrics()
            
            # Track metrics export
            self.metrics_collector.increment_counter("api_metrics_exports_total",
                                                   labels={"format": "prometheus"})
            
            return metrics_data.decode('utf-8') if isinstance(metrics_data, bytes) else metrics_data
            
        except Exception as e:
            self.logger.error("Error exporting Prometheus metrics", error=str(e))
            raise HTTPException(status_code=500, detail="Failed to export metrics")
    
    async def _get_performance_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics"""
        try:
            stats = self.metrics_collector.get_all_stats()
            
            # Add storage stats if available
            if self.storage_manager:
                stats["storage"] = self.storage_manager.get_metrics()
            
            # Add API-specific stats
            stats["api"] = {
                "server_time": datetime.utcnow().isoformat(),
                "uptime_seconds": time.time() - getattr(self, '_start_time', time.time())
            }
            
            # Track stats request
            self.metrics_collector.increment_counter("api_stats_requests_total",
                                                   labels={"endpoint": "performance"})
            
            return stats
            
        except Exception as e:
            self.logger.error("Error getting performance stats", error=str(e))
            raise HTTPException(status_code=500, detail="Failed to get performance statistics")
    
    async def _get_latency_stats(self) -> Dict[str, Any]:
        """Get detailed latency statistics"""
        try:
            latency_stats = self.metrics_collector.get_latency_stats()
            
            # Track latency stats request
            self.metrics_collector.increment_counter("api_stats_requests_total",
                                                   labels={"endpoint": "latency"})
            
            return {
                "timestamp": time.time(),
                "latency_stats": latency_stats
            }
            
        except Exception as e:
            self.logger.error("Error getting latency stats", error=str(e))
            raise HTTPException(status_code=500, detail="Failed to get latency statistics")
    
    async def _get_throughput_stats(self) -> Dict[str, Any]:
        """Get throughput statistics"""
        try:
            throughput_stats = self.metrics_collector.get_throughput_stats()
            resource_stats = self.metrics_collector.get_resource_stats()
            
            # Track throughput stats request
            self.metrics_collector.increment_counter("api_stats_requests_total",
                                                   labels={"endpoint": "throughput"})
            
            return {
                "timestamp": time.time(),
                "throughput": throughput_stats,
                "resources": resource_stats
            }
            
        except Exception as e:
            self.logger.error("Error getting throughput stats", error=str(e))
            raise HTTPException(status_code=500, detail="Failed to get throughput statistics")
    
    async def _get_storage_stats(self) -> Dict[str, Any]:
        """Get storage layer statistics"""
        try:
            if not self.storage_manager:
                raise HTTPException(status_code=503, detail="Storage manager not available")
            
            storage_stats = self.storage_manager.get_metrics()
            
            # Track storage stats request
            self.metrics_collector.increment_counter("api_stats_requests_total",
                                                   labels={"endpoint": "storage"})
            
            return {
                "timestamp": time.time(),
                "storage": storage_stats
            }
            
        except Exception as e:
            self.logger.error("Error getting storage stats", error=str(e))
            raise HTTPException(status_code=500, detail="Failed to get storage statistics")
    
    async def _get_sanitized_config(self) -> Dict[str, Any]:
        """Get sanitized configuration (remove sensitive data)"""
        try:
            config = dict(self.config)
            
            # Remove sensitive information
            sensitive_keys = ['password', 'secret', 'key', 'token', 'auth']
            
            def sanitize_dict(d):
                if isinstance(d, dict):
                    return {
                        k: "***REDACTED***" if any(sens in k.lower() for sens in sensitive_keys)
                        else sanitize_dict(v)
                        for k, v in d.items()
                    }
                return d
            
            sanitized_config = sanitize_dict(config)
            
            # Track config request
            self.metrics_collector.increment_counter("api_config_requests_total",
                                                   labels={"action": "get"})
            
            return {
                "timestamp": time.time(),
                "config": sanitized_config
            }
            
        except Exception as e:
            self.logger.error("Error getting configuration", error=str(e))
            raise HTTPException(status_code=500, detail="Failed to get configuration")
    
    async def _reload_config(self) -> Dict[str, Any]:
        """Reload system configuration"""
        try:
            # This would typically reload configuration from file/environment
            # For now, just return current config
            
            # Track config reload
            self.metrics_collector.increment_counter("api_config_requests_total",
                                                   labels={"action": "reload"})
            
            return {
                "timestamp": time.time(),
                "status": "success",
                "message": "Configuration reload requested"
            }
            
        except Exception as e:
            self.logger.error("Error reloading configuration", error=str(e))
            raise HTTPException(status_code=500, detail="Failed to reload configuration")
    
    def set_storage_manager(self, storage_manager: StorageManager):
        """Set storage manager reference"""
        self.storage_manager = storage_manager
    
    async def start_server(self, host: str = "0.0.0.0", port: int = 8080):
        """Start the API server"""
        if not FASTAPI_AVAILABLE:
            self.logger.error("Cannot start API server: FastAPI not available")
            return
        
        self._start_time = time.time()
        
        config = uvicorn.Config(
            self.app,
            host=host,
            port=port,
            log_level="info",
            access_log=True
        )
        
        self.server = uvicorn.Server(config)
        
        self.logger.info(f"Starting API server on {host}:{port}")
        
        try:
            await self.server.serve()
        except Exception as e:
            self.logger.error(f"Error starting API server: {e}")
            raise
    
    async def stop_server(self):
        """Stop the API server"""
        if self.server:
            self.logger.info("Stopping API server")
            self.server.should_exit = True
            await self.server.shutdown()


# Global API server instance
_global_api_server: Optional[APIServer] = None


def get_api_server(config: Optional[Dict[str, Any]] = None) -> APIServer:
    """Get or create global API server instance"""
    global _global_api_server
    
    if _global_api_server is None:
        _global_api_server = APIServer(config)
    
    return _global_api_server


async def start_api_server(host: str = "0.0.0.0", port: int = 8080, 
                          config: Optional[Dict[str, Any]] = None):
    """Start the global API server"""
    server = get_api_server(config)
    await server.start_server(host, port)


async def stop_api_server():
    """Stop the global API server"""
    global _global_api_server
    
    if _global_api_server:
        await _global_api_server.stop_server()
        _global_api_server = None