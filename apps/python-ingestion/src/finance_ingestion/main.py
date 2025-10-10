"""
Main Application Entry Point

Provides the main application class with proper lifecycle management,
graceful shutdown handling, and container orchestration support.
"""

import asyncio
import signal
import sys
import time
<<<<<<< HEAD
<<<<<<< HEAD
import os
=======
>>>>>>> e208aed (feat(python): implement main application with graceful shutdown handling)
=======
import os
>>>>>>> e1adc3f (fix(python): add missing os import in main.py)
from typing import Optional, Dict, Any
import logging

try:
    import uvloop
    UVLOOP_AVAILABLE = True
except ImportError:
    UVLOOP_AVAILABLE = False

from .config import get_config
from .logging import setup_logging, get_logger
from .api import APIServer, get_api_server
from .metrics import get_metrics_collector
from .storage.storage_manager import StorageManager
from .exceptions import FinanceIngestionError, handle_exception


class FinanceIngestionApp:
    """Main application class with lifecycle management"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or get_config()
        self.logger = None
        self.api_server: Optional[APIServer] = None
        self.storage_manager: Optional[StorageManager] = None
        self.metrics_collector = None
        
        # Shutdown management
        self.shutdown_event = asyncio.Event()
        self.is_shutting_down = False
        self.start_time = time.time()
        
        # Component tasks
        self.tasks = []
        
    async def initialize(self):
        """Initialize the application"""
        # Setup logging first
        setup_logging(self.config)
        self.logger = get_logger('main-app')
        
        self.logger.info(
            "Initializing Finance Ingestion Application",
            version="1.0.0",
            environment=self.config.get('environment', 'development'),
            uvloop_available=UVLOOP_AVAILABLE
        )
        
        # Initialize metrics collector
        self.metrics_collector = get_metrics_collector(self.config.get('metrics', {}))
        
        # Initialize storage manager
        self.storage_manager = StorageManager(self.config)
        await self.storage_manager.initialize()
        
        # Initialize API server
        self.api_server = get_api_server(self.config)
        self.api_server.set_storage_manager(self.storage_manager)
        
        # Setup signal handlers for graceful shutdown
        self._setup_signal_handlers()
        
        self.logger.info("Application initialization completed")
        
    def _setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        def signal_handler(signum, frame):
            self.logger.info(f"Received signal {signum}, initiating graceful shutdown")
            asyncio.create_task(self.shutdown())
        
        # Handle common shutdown signals
        signal.signal(signal.SIGTERM, signal_handler)
        signal.signal(signal.SIGINT, signal_handler)
        
        # Handle SIGUSR1 for configuration reload (if supported)
        if hasattr(signal, 'SIGUSR1'):
            signal.signal(signal.SIGUSR1, self._handle_reload_signal)
    
    def _handle_reload_signal(self, signum, frame):
        """Handle configuration reload signal"""
        self.logger.info("Received SIGUSR1, reloading configuration")
        # TODO: Implement configuration reload
        
    async def start(self):
        """Start the application"""
        try:
            await self.initialize()
            
            self.logger.info("Starting application components")
            
            # Start API server
            api_task = asyncio.create_task(
                self.api_server.start_server(
                    host=self.config.get('api', {}).get('host', '0.0.0.0'),
                    port=self.config.get('api', {}).get('port', 8000)
                )
            )
            self.tasks.append(api_task)
            
            # Start main ingestion loop (placeholder for now)
            ingestion_task = asyncio.create_task(self._run_ingestion_loop())
            self.tasks.append(ingestion_task)
            
            # Start health monitoring
            health_task = asyncio.create_task(self._health_monitoring_loop())
            self.tasks.append(health_task)
            
            self.logger.info("All application components started successfully")
            
            # Wait for shutdown signal
            await self.shutdown_event.wait()
            
        except Exception as e:
            self.logger.error("Error starting application", error=str(e), stack=str(e.__traceback__))
            raise
        finally:
            await self.cleanup()
    
    async def _run_ingestion_loop(self):
        """Main ingestion loop (placeholder)"""
        self.logger.info("Starting ingestion loop")
        
        try:
            while not self.shutdown_event.is_set():
                # Placeholder for actual ingestion logic
                # This will be implemented in subsequent tasks
                await asyncio.sleep(1)
                
                # Update metrics
                self.metrics_collector.increment_counter('app_heartbeat_total')
                
        except asyncio.CancelledError:
            self.logger.info("Ingestion loop cancelled")
            raise
        except Exception as e:
            self.logger.error("Error in ingestion loop", error=str(e))
            raise
    
    async def _health_monitoring_loop(self):
        """Health monitoring loop"""
        self.logger.info("Starting health monitoring loop")
        
        try:
            while not self.shutdown_event.is_set():
                # Perform health checks
                try:
                    # Check storage manager health
                    if self.storage_manager:
                        storage_health = await self.storage_manager.health_check()
                        if not storage_health.get('healthy', False):
                            self.logger.warning("Storage manager health check failed", 
                                              health=storage_health)
                    
                    # Update health metrics
                    self.metrics_collector.increment_counter('app_health_checks_total')
                    
                except Exception as e:
                    self.logger.error("Health check failed", error=str(e))
                    self.metrics_collector.increment_counter('app_health_check_errors_total')
                
                # Wait before next check
                await asyncio.sleep(30)  # Check every 30 seconds
                
        except asyncio.CancelledError:
            self.logger.info("Health monitoring loop cancelled")
            raise
        except Exception as e:
            self.logger.error("Error in health monitoring loop", error=str(e))
            raise
    
    async def shutdown(self):
        """Graceful shutdown"""
        if self.is_shutting_down:
            self.logger.warning("Shutdown already in progress")
            return
        
        self.is_shutting_down = True
        self.logger.info("Starting graceful shutdown")
        
        # Set shutdown event to stop loops
        self.shutdown_event.set()
        
        # Get shutdown timeout from config or environment
        shutdown_timeout = int(self.config.get('graceful_shutdown_timeout', 
                                             os.environ.get('GRACEFUL_SHUTDOWN_TIMEOUT', 30)))
        
        # Cancel all tasks with timeout
        if self.tasks:
            self.logger.info(f"Cancelling {len(self.tasks)} tasks")
            
            for task in self.tasks:
                if not task.done():
                    task.cancel()
            
            # Wait for tasks to complete with timeout
            try:
                await asyncio.wait_for(
                    asyncio.gather(*self.tasks, return_exceptions=True),
                    timeout=shutdown_timeout
                )
            except asyncio.TimeoutError:
                self.logger.warning("Some tasks did not complete within shutdown timeout")
        
        # Stop API server
        if self.api_server:
            self.logger.info("Stopping API server")
            await self.api_server.stop_server()
        
        self.logger.info("Graceful shutdown completed")
    
    async def cleanup(self):
        """Cleanup resources"""
        self.logger.info("Cleaning up application resources")
        
        try:
            # Cleanup storage manager
            if self.storage_manager:
                await self.storage_manager.cleanup()
            
            # Final metrics export
            if self.metrics_collector:
                self.logger.info("Exporting final metrics")
                # Export final metrics if needed
            
            self.logger.info("Application cleanup completed")
            
        except Exception as e:
            self.logger.error("Error during cleanup", error=str(e))
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get application health status"""
        uptime = time.time() - self.start_time
        
        health = {
            'status': 'healthy' if not self.is_shutting_down else 'shutting_down',
            'uptime_seconds': uptime,
            'components': {}
        }
        
        # Check storage manager
        if self.storage_manager:
            try:
                storage_metrics = self.storage_manager.get_metrics()
                health['components']['storage'] = {
                    'status': 'healthy',
                    'metrics': storage_metrics
                }
            except Exception as e:
                health['components']['storage'] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
        
        # Check API server
        if self.api_server:
            health['components']['api'] = {
                'status': 'healthy' if self.api_server.server else 'stopped'
            }
        
        return health


# Global application instance
_global_app: Optional[FinanceIngestionApp] = None


def get_app(config: Optional[Dict[str, Any]] = None) -> FinanceIngestionApp:
    """Get or create global application instance"""
    global _global_app
    
    if _global_app is None:
        _global_app = FinanceIngestionApp(config)
    
    return _global_app


async def main():
    """Main entry point"""
    import os
    
    try:
        # Use uvloop for maximum performance (if available)
        if UVLOOP_AVAILABLE and os.name != 'nt':  # Not on Windows
            uvloop.install()
        
        # Create and start application
        app = get_app()
        await app.start()
        
    except KeyboardInterrupt:
        print("Received keyboard interrupt, shutting down...")
    except Exception as e:
        print(f"Application error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())