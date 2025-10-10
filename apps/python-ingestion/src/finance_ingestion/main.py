"""
Main Application Entry Point

Provides the main application class with proper lifecycle management,
graceful shutdown handling, and container orchestration support.
"""

import asyncio
import signal
import sys
import time
import os
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
        """Initialize the application with comprehensive error handling"""
        try:
            # Setup logging first
            setup_logging(self.config)
            self.logger = get_logger('main-app')
            
            self.logger.info(
                "Initializing Finance Ingestion Application",
                version="1.0.0",
                environment=self.config.get('environment', 'development'),
                uvloop_available=UVLOOP_AVAILABLE
            )
            
            # Initialize metrics collector with error handling
            try:
                self.metrics_collector = get_metrics_collector(self.config.get('metrics', {}))
                self.logger.info("Metrics collector initialized successfully")
            except Exception as e:
                self.logger.error("Failed to initialize metrics collector", error=str(e))
                raise FinanceIngestionError(f"Metrics initialization failed: {e}")
            
            # Initialize storage manager with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    self.storage_manager = StorageManager(self.config)
                    await self.storage_manager.initialize()
                    self.logger.info("Storage manager initialized successfully")
                    break
                except Exception as e:
                    self.logger.warning(
                        f"Storage initialization attempt {attempt + 1} failed", 
                        error=str(e)
                    )
                    if attempt == max_retries - 1:
                        self.logger.error("All storage initialization attempts failed")
                        raise FinanceIngestionError(f"Storage initialization failed: {e}")
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
            
            # Initialize API server with error handling
            try:
                self.api_server = get_api_server(self.config)
                self.api_server.set_storage_manager(self.storage_manager)
                self.logger.info("API server initialized successfully")
            except Exception as e:
                self.logger.error("Failed to initialize API server", error=str(e))
                raise FinanceIngestionError(f"API server initialization failed: {e}")
            
            # Setup signal handlers for graceful shutdown
            self._setup_signal_handlers()
            
            # Initialize error recovery mechanisms
            self._setup_error_recovery()
            
            self.logger.info("Application initialization completed successfully")
            
        except Exception as e:
            self.logger.error("Critical error during application initialization", error=str(e))
            raise
        
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
        
    def _setup_error_recovery(self):
        """Setup comprehensive error recovery mechanisms"""
        self.logger.info("Setting up error recovery mechanisms")
        
        # Error recovery configuration
        self.error_recovery_config = {
            'max_consecutive_errors': 10,
            'error_reset_interval': 300,  # 5 minutes
            'circuit_breaker_threshold': 5,
            'circuit_breaker_timeout': 60,  # 1 minute
        }
        
        # Error tracking
        self.consecutive_errors = 0
        self.last_error_time = 0
        self.circuit_breaker_open = False
        self.circuit_breaker_open_time = 0
        
        self.logger.info("Error recovery mechanisms configured")
    
    async def _handle_component_error(self, component: str, error: Exception, recovery_action: Optional[callable] = None):
        """Handle component errors with recovery logic"""
        current_time = time.time()
        
        # Track consecutive errors
        if current_time - self.last_error_time > self.error_recovery_config['error_reset_interval']:
            self.consecutive_errors = 0
        
        self.consecutive_errors += 1
        self.last_error_time = current_time
        
        self.logger.error(
            f"Component error in {component}",
            error=str(error),
            consecutive_errors=self.consecutive_errors
        )
        
        # Update error metrics
        self.metrics_collector.increment_counter(
            'component_errors_total',
            labels={'component': component, 'error_type': type(error).__name__}
        )
        
        # Circuit breaker logic
        if self.consecutive_errors >= self.error_recovery_config['circuit_breaker_threshold']:
            if not self.circuit_breaker_open:
                self.logger.warning(f"Opening circuit breaker for {component}")
                self.circuit_breaker_open = True
                self.circuit_breaker_open_time = current_time
                self.metrics_collector.increment_counter('circuit_breaker_opened_total')
        
        # Check if circuit breaker should be closed
        if (self.circuit_breaker_open and 
            current_time - self.circuit_breaker_open_time > self.error_recovery_config['circuit_breaker_timeout']):
            self.logger.info(f"Closing circuit breaker for {component}")
            self.circuit_breaker_open = False
            self.consecutive_errors = 0
            self.metrics_collector.increment_counter('circuit_breaker_closed_total')
        
        # Execute recovery action if provided and circuit breaker is closed
        if recovery_action and not self.circuit_breaker_open:
            try:
                self.logger.info(f"Executing recovery action for {component}")
                await recovery_action()
                self.logger.info(f"Recovery action completed for {component}")
            except Exception as recovery_error:
                self.logger.error(
                    f"Recovery action failed for {component}",
                    error=str(recovery_error)
                )
        
        # Shutdown if too many consecutive errors
        if self.consecutive_errors >= self.error_recovery_config['max_consecutive_errors']:
            self.logger.critical(
                f"Maximum consecutive errors reached for {component}, initiating shutdown"
            )
            await self.shutdown()
        
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
        """Main ingestion loop with complete WebSocket to storage data flow"""
        self.logger.info("Starting complete ingestion loop")
        
        try:
            # Import components for integration
            from .websocket.connection_manager import WebSocketConnectionManager
            from .message_processor import MessageProcessor
            
            # Initialize WebSocket connection manager
            websocket_config = self.config.get('websocket', {})
            websocket_url = websocket_config.get('url', 'wss://localhost:8080/market-data')
            
            connection_manager = WebSocketConnectionManager(
                url=websocket_url,
                config=websocket_config
            )
            
            # Initialize message processor
            message_processor = MessageProcessor(
                storage_manager=self.storage_manager,
                metrics_collector=self.metrics_collector,
                config=self.config.get('message_processor', {})
            )
            
            # Set up message processing callback
            async def process_message(message_data: bytes):
                """Process incoming WebSocket message"""
                try:
                    # Record message receipt time for latency measurement
                    receipt_time = time.perf_counter_ns()
                    
                    # Process the message through the message processor
                    await message_processor.process_message(message_data, receipt_time)
                    
                    # Update metrics
                    self.metrics_collector.increment_counter('messages_processed_total')
                    
                except Exception as e:
                    self.logger.error("Error processing message", error=str(e))
                    self.metrics_collector.increment_counter('message_processing_errors_total')
            
            # Set up connection event handlers
            def on_connected():
                self.logger.info("WebSocket connected successfully")
                self.metrics_collector.increment_counter('websocket_connections_total')
            
            def on_disconnected(reason: str):
                self.logger.warning("WebSocket disconnected", reason=reason)
                self.metrics_collector.increment_counter('websocket_disconnections_total')
            
            def on_error(error: Exception):
                self.logger.error("WebSocket error", error=str(error))
                self.metrics_collector.increment_counter('websocket_errors_total')
            
            # Register event handlers
            connection_manager.on_message = process_message
            connection_manager.on_connected = on_connected
            connection_manager.on_disconnected = on_disconnected
            connection_manager.on_error = on_error
            
            # Start WebSocket connection
            self.logger.info(f"Connecting to WebSocket: {websocket_url}")
            await connection_manager.connect()
            
            # Main ingestion loop - keep connection alive and handle reconnections
            while not self.shutdown_event.is_set():
                try:
                    # Check connection health
                    if not connection_manager.is_connected():
                        self.logger.warning("WebSocket connection lost, attempting reconnection")
                        await connection_manager.reconnect()
                    
                    # Update heartbeat metrics
                    self.metrics_collector.increment_counter('app_heartbeat_total')
                    
                    # Wait before next health check
                    await asyncio.sleep(5)
                    
                except Exception as e:
                    # Use comprehensive error handling
                    await self._handle_component_error(
                        'ingestion_loop', 
                        e,
                        recovery_action=lambda: connection_manager.reconnect()
                    )
                    await asyncio.sleep(1)  # Brief pause before retry
            
            # Graceful shutdown of WebSocket connection
            self.logger.info("Shutting down WebSocket connection")
            await connection_manager.disconnect()
                
        except asyncio.CancelledError:
            self.logger.info("Ingestion loop cancelled")
            raise
        except Exception as e:
            self.logger.error("Fatal error in ingestion loop", error=str(e))
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