"""
WebSocket Connection Manager

High-performance WebSocket client with connection health monitoring, automatic
reconnection with exponential backoff, and comprehensive statistics tracking.
"""

import asyncio
import json
import random
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Union
from urllib.parse import urlparse

import websockets
from websockets.client import WebSocketClientProtocol
from websockets.exceptions import (
    ConnectionClosed,
    ConnectionClosedError,
    ConnectionClosedOK,
    InvalidHandshake,
    InvalidURI,
    WebSocketException,
)

from ..config import AppConfig, WebSocketConfig, get_config
from ..exceptions import ConnectionError, TimeoutError, handle_exception
from ..logging import get_logger, LoggingContext, set_correlation_id


class ConnectionState(Enum):
    """WebSocket connection states."""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    CLOSING = "closing"
    CLOSED = "closed"
    ERROR = "error"


@dataclass
class ConnectionStats:
    """Connection statistics and health metrics."""
    
    # Connection state
    state: ConnectionState = ConnectionState.DISCONNECTED
    connected_at: Optional[float] = None
    disconnected_at: Optional[float] = None
    connection_duration_ms: float = 0.0
    
    # Connection attempts
    total_connections: int = 0
    successful_connections: int = 0
    failed_connections: int = 0
    reconnection_attempts: int = 0
    
    # Message statistics
    messages_sent: int = 0
    messages_received: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0
    
    # Latency measurements (in nanoseconds)
    ping_latency_ns: Optional[int] = None
    last_ping_ns: Optional[int] = None
    avg_ping_latency_ns: float = 0.0
    min_ping_latency_ns: Optional[int] = None
    max_ping_latency_ns: Optional[int] = None
    ping_samples: List[int] = field(default_factory=list)
    
    # Error tracking
    connection_errors: int = 0
    message_errors: int = 0
    timeout_errors: int = 0
    last_error: Optional[str] = None
    last_error_time: Optional[float] = None
    
    # Bandwidth tracking (bytes per second)
    send_bandwidth_bps: float = 0.0
    receive_bandwidth_bps: float = 0.0
    bandwidth_window_start: float = field(default_factory=time.time)
    bandwidth_bytes_sent_window: int = 0
    bandwidth_bytes_received_window: int = 0
    
    def update_bandwidth(self) -> None:
        """Update bandwidth calculations."""
        now = time.time()
        window_duration = now - self.bandwidth_window_start
        
        if window_duration >= 1.0:
            # Calculate bandwidth over the window
            self.send_bandwidth_bps = self.bandwidth_bytes_sent_window / window_duration
            self.receive_bandwidth_bps = self.bandwidth_bytes_received_window / window_duration
            
            # Reset window
            self.bandwidth_window_start = now
            self.bandwidth_bytes_sent_window = 0
            self.bandwidth_bytes_received_window = 0

    def update_ping_latency(self, latency_ns: int) -> None:
        """Update ping latency statistics."""
        self.ping_latency_ns = latency_ns
        self.last_ping_ns = time.perf_counter_ns()
        
        # Update min/max
        if self.min_ping_latency_ns is None or latency_ns < self.min_ping_latency_ns:
            self.min_ping_latency_ns = latency_ns
        if self.max_ping_latency_ns is None or latency_ns > self.max_ping_latency_ns:
            self.max_ping_latency_ns = latency_ns
        
        # Keep rolling average of last 100 samples
        self.ping_samples.append(latency_ns)
        if len(self.ping_samples) > 100:
            self.ping_samples.pop(0)
        
        self.avg_ping_latency_ns = sum(self.ping_samples) / len(self.ping_samples)

    def record_error(self, error: str) -> None:
        """Record an error occurrence."""
        self.last_error = error
        self.last_error_time = time.time()
        
        if "connection" in error.lower():
            self.connection_errors += 1
        elif "timeout" in error.lower():
            self.timeout_errors += 1
        else:
            self.message_errors += 1

    def to_dict(self) -> Dict[str, Any]:
        """Convert stats to dictionary for serialization."""
        return {
            "state": self.state.value,
            "connected_at": self.connected_at,
            "disconnected_at": self.disconnected_at,
            "connection_duration_ms": self.connection_duration_ms,
            "total_connections": self.total_connections,
            "successful_connections": self.successful_connections,
            "failed_connections": self.failed_connections,
            "reconnection_attempts": self.reconnection_attempts,
            "messages_sent": self.messages_sent,
            "messages_received": self.messages_received,
            "bytes_sent": self.bytes_sent,
            "bytes_received": self.bytes_received,
            "ping_latency_ms": self.ping_latency_ns / 1_000_000 if self.ping_latency_ns else None,
            "avg_ping_latency_ms": self.avg_ping_latency_ns / 1_000_000,
            "min_ping_latency_ms": self.min_ping_latency_ns / 1_000_000 if self.min_ping_latency_ns else None,
            "max_ping_latency_ms": self.max_ping_latency_ns / 1_000_000 if self.max_ping_latency_ns else None,
            "connection_errors": self.connection_errors,
            "message_errors": self.message_errors,
            "timeout_errors": self.timeout_errors,
            "last_error": self.last_error,
            "last_error_time": self.last_error_time,
            "send_bandwidth_bps": self.send_bandwidth_bps,
            "receive_bandwidth_bps": self.receive_bandwidth_bps
        }


class WebSocketConnectionManager:
    """
    High-performance WebSocket connection manager with health monitoring,
    automatic reconnection, and comprehensive statistics tracking.
    
    Features:
    - Exponential backoff reconnection with jitter
    - Connection health monitoring with heartbeat
    - Latency and bandwidth tracking
    - Comprehensive error handling and recovery
    - Thread-safe statistics collection
    """

    def __init__(
        self,
        config: Optional[WebSocketConfig] = None,
        message_handler: Optional[Callable[[str], None]] = None,
        error_handler: Optional[Callable[[Exception], None]] = None
    ):
        """
        Initialize WebSocket connection manager.
        
        Args:
            config: WebSocket configuration
            message_handler: Callback for received messages
            error_handler: Callback for error handling
        """
        self.config = config or get_config().websocket
        self.message_handler = message_handler
        self.error_handler = error_handler
        
        # Connection state
        self._websocket: Optional[WebSocketClientProtocol] = None
        self._stats = ConnectionStats()
        self._connection_lock = asyncio.Lock()
        self._shutdown_event = asyncio.Event()
        
        # Reconnection parameters
        self._reconnect_delay = self.config.initial_reconnect_delay
        self._max_reconnect_delay = self.config.max_reconnect_delay
        self._reconnect_backoff = self.config.reconnect_backoff_multiplier
        self._reconnect_jitter = self.config.reconnect_jitter
        
        # Heartbeat parameters
        self._heartbeat_interval = self.config.heartbeat_interval
        self._heartbeat_timeout = self.config.heartbeat_timeout
        self._last_heartbeat = None
        self._heartbeat_task: Optional[asyncio.Task] = None
        
        # Background tasks
        self._connection_task: Optional[asyncio.Task] = None
        self._message_task: Optional[asyncio.Task] = None
        
        self.logger = get_logger(__name__)
        self.logger.info("WebSocket connection manager initialized", {
            "url": self.config.url,
            "heartbeat_interval": self._heartbeat_interval,
            "max_reconnect_delay": self._max_reconnect_delay
        })

    @property
    def is_connected(self) -> bool:
        """Check if WebSocket is currently connected."""
        return (
            self._websocket is not None 
            and not self._websocket.closed 
            and self._stats.state == ConnectionState.CONNECTED
        )

    @property
    def stats(self) -> ConnectionStats:
        """Get current connection statistics."""
        if self.is_connected and self._stats.connected_at:
            self._stats.connection_duration_ms = (
                time.time() - self._stats.connected_at
            ) * 1000
        return self._stats

    async def connect(self) -> bool:
        """
        Establish WebSocket connection.
        
        Returns:
            True if connection successful, False otherwise
        """
        async with self._connection_lock:
            if self.is_connected:
                self.logger.debug("Already connected")
                return True

            correlation_id = set_correlation_id()
            
            try:
                self._stats.state = ConnectionState.CONNECTING
                self._stats.total_connections += 1
                
                self.logger.info("Connecting to WebSocket", {
                    "url": self.config.url,
                    "correlation_id": correlation_id
                })

                # Parse URL and validate
                parsed_url = urlparse(self.config.url)
                if parsed_url.scheme not in ('ws', 'wss'):
                    raise InvalidURI(f"Invalid WebSocket URL scheme: {parsed_url.scheme}")

                # Establish connection with timeout
                self._websocket = await asyncio.wait_for(
                    websockets.connect(
                        self.config.url,
                        ping_interval=self._heartbeat_interval,
                        ping_timeout=self._heartbeat_timeout,
                        close_timeout=self.config.close_timeout,
                        max_size=self.config.max_message_size,
                        compression=self.config.compression,
                        extra_headers=self.config.headers
                    ),
                    timeout=self.config.connection_timeout
                )

                # Update connection state
                self._stats.state = ConnectionState.CONNECTED
                self._stats.connected_at = time.time()
                self._stats.successful_connections += 1
                self._stats.disconnected_at = None
                
                # Reset reconnection delay on successful connection
                self._reconnect_delay = self.config.initial_reconnect_delay

                self.logger.info("WebSocket connected successfully", {
                    "correlation_id": correlation_id,
                    "local_address": self._websocket.local_address,
                    "remote_address": self._websocket.remote_address
                })

                # Start background tasks
                await self._start_background_tasks()
                
                return True

            except asyncio.TimeoutError:
                error_msg = f"Connection timeout after {self.config.connection_timeout}s"
                self._handle_connection_error(TimeoutError(error_msg))
                return False
                
            except (InvalidURI, InvalidHandshake) as e:
                error_msg = f"Invalid WebSocket configuration: {e}"
                self._handle_connection_error(ConnectionError(error_msg))
                return False
                
            except Exception as e:
                error_msg = f"Connection failed: {e}"
                self._handle_connection_error(ConnectionError(error_msg))
                return False

    async def disconnect(self, code: int = 1000, reason: str = "Normal closure") -> None:
        """
        Gracefully disconnect WebSocket.
        
        Args:
            code: WebSocket close code
            reason: Reason for disconnection
        """
        async with self._connection_lock:
            if not self._websocket:
                return

            self._stats.state = ConnectionState.CLOSING
            
            try:
                self.logger.info("Disconnecting WebSocket", {
                    "code": code,
                    "reason": reason
                })

                # Stop background tasks
                await self._stop_background_tasks()

                # Close WebSocket connection
                await self._websocket.close(code=code, reason=reason)
                
                self._stats.state = ConnectionState.CLOSED
                self._stats.disconnected_at = time.time()
                
                self.logger.info("WebSocket disconnected")

            except Exception as e:
                self.logger.error("Error during disconnect", {"error": str(e)})
            finally:
                self._websocket = None

    async def send_message(self, message: Union[str, bytes]) -> bool:
        """
        Send message through WebSocket.
        
        Args:
            message: Message to send (string or bytes)
            
        Returns:
            True if message sent successfully, False otherwise
        """
        if not self.is_connected:
            self.logger.warning("Cannot send message: not connected")
            return False

        try:
            start_time = time.perf_counter_ns()
            
            if isinstance(message, str):
                await self._websocket.send(message)
                message_size = len(message.encode('utf-8'))
            else:
                await self._websocket.send(message)
                message_size = len(message)

            # Update statistics
            self._stats.messages_sent += 1
            self._stats.bytes_sent += message_size
            self._stats.bandwidth_bytes_sent_window += message_size
            self._stats.update_bandwidth()

            send_latency = time.perf_counter_ns() - start_time
            
            self.logger.debug("Message sent", {
                "size_bytes": message_size,
                "send_latency_ns": send_latency
            })
            
            return True

        except ConnectionClosed:
            self.logger.warning("Connection closed while sending message")
            await self._handle_disconnect()
            return False
            
        except Exception as e:
            error_msg = f"Failed to send message: {e}"
            self.logger.error(error_msg)
            self._stats.record_error(error_msg)
            return False

    async def start_auto_reconnect(self) -> None:
        """Start automatic reconnection loop."""
        if self._connection_task and not self._connection_task.done():
            return

        self._connection_task = asyncio.create_task(self._auto_reconnect_loop())
        self.logger.info("Auto-reconnect started")

    async def stop_auto_reconnect(self) -> None:
        """Stop automatic reconnection."""
        self._shutdown_event.set()
        
        if self._connection_task:
            self._connection_task.cancel()
            try:
                await self._connection_task
            except asyncio.CancelledError:
                pass
            self._connection_task = None
            
        self.logger.info("Auto-reconnect stopped")

    async def _auto_reconnect_loop(self) -> None:
        """Main reconnection loop with exponential backoff."""
        while not self._shutdown_event.is_set():
            try:
                if not self.is_connected:
                    self._stats.state = ConnectionState.RECONNECTING
                    self._stats.reconnection_attempts += 1
                    
                    self.logger.info("Attempting reconnection", {
                        "attempt": self._stats.reconnection_attempts,
                        "delay": self._reconnect_delay
                    })

                    success = await self.connect()
                    
                    if not success:
                        # Apply exponential backoff with jitter
                        jitter = random.uniform(0, self._reconnect_jitter)
                        delay = min(self._reconnect_delay + jitter, self._max_reconnect_delay)
                        
                        self.logger.info("Reconnection failed, backing off", {
                            "next_attempt_in": delay,
                            "current_delay": self._reconnect_delay
                        })
                        
                        await asyncio.sleep(delay)
                        self._reconnect_delay = min(
                            self._reconnect_delay * self._reconnect_backoff,
                            self._max_reconnect_delay
                        )
                    else:
                        self.logger.info("Reconnection successful")
                        
                # Wait before next check
                await asyncio.sleep(1.0)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error("Error in reconnection loop", {"error": str(e)})
                await asyncio.sleep(5.0)

    async def _start_background_tasks(self) -> None:
        """Start background tasks for message handling and heartbeat."""
        # Start message receiving task
        self._message_task = asyncio.create_task(self._message_loop())
        
        # Start heartbeat task
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

    async def _stop_background_tasks(self) -> None:
        """Stop all background tasks."""
        tasks = [self._message_task, self._heartbeat_task]
        
        for task in tasks:
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        self._message_task = None
        self._heartbeat_task = None

    async def _message_loop(self) -> None:
        """Main message receiving loop."""
        try:
            async for message in self._websocket:
                start_time = time.perf_counter_ns()
                
                # Update statistics
                self._stats.messages_received += 1
                message_size = len(message) if isinstance(message, (str, bytes)) else 0
                self._stats.bytes_received += message_size
                self._stats.bandwidth_bytes_received_window += message_size
                self._stats.update_bandwidth()

                # Handle message
                if self.message_handler:
                    try:
                        if asyncio.iscoroutinefunction(self.message_handler):
                            await self.message_handler(message)
                        else:
                            self.message_handler(message)
                    except Exception as e:
                        self.logger.error("Error in message handler", {"error": str(e)})
                        self._stats.record_error(f"Message handler error: {e}")

                receive_latency = time.perf_counter_ns() - start_time
                self.logger.debug("Message received", {
                    "size_bytes": message_size,
                    "receive_latency_ns": receive_latency
                })

        except ConnectionClosedOK:
            self.logger.info("Connection closed normally")
        except ConnectionClosedError as e:
            self.logger.warning("Connection closed with error", {"code": e.code, "reason": e.reason})
        except Exception as e:
            self.logger.error("Error in message loop", {"error": str(e)})
        finally:
            await self._handle_disconnect()

    async def _heartbeat_loop(self) -> None:
        """Heartbeat monitoring loop."""
        try:
            while self.is_connected and not self._shutdown_event.is_set():
                try:
                    # Send ping and measure latency
                    start_time = time.perf_counter_ns()
                    pong_waiter = await self._websocket.ping()
                    await asyncio.wait_for(pong_waiter, timeout=self._heartbeat_timeout)
                    
                    latency_ns = time.perf_counter_ns() - start_time
                    self._stats.update_ping_latency(latency_ns)
                    
                    self.logger.debug("Heartbeat successful", {
                        "latency_ms": latency_ns / 1_000_000
                    })
                    
                except asyncio.TimeoutError:
                    self.logger.warning("Heartbeat timeout")
                    self._stats.record_error("Heartbeat timeout")
                    break
                    
                await asyncio.sleep(self._heartbeat_interval)
                
        except Exception as e:
            self.logger.error("Error in heartbeat loop", {"error": str(e)})

    async def _handle_disconnect(self) -> None:
        """Handle unexpected disconnection."""
        if self._stats.state not in (ConnectionState.CLOSING, ConnectionState.CLOSED):
            self._stats.state = ConnectionState.DISCONNECTED
            self._stats.disconnected_at = time.time()
            
            self.logger.warning("Connection lost unexpectedly")
            
            # Stop background tasks
            await self._stop_background_tasks()
            
            self._websocket = None

    def _handle_connection_error(self, error: Exception) -> None:
        """Handle connection errors."""
        self._stats.state = ConnectionState.ERROR
        self._stats.failed_connections += 1
        self._stats.record_error(str(error))
        
        self.logger.error("Connection error", {"error": str(error)})
        
        if self.error_handler:
            try:
                if asyncio.iscoroutinefunction(self.error_handler):
                    asyncio.create_task(self.error_handler(error))
                else:
                    self.error_handler(error)
            except Exception as e:
                self.logger.error("Error in error handler", {"error": str(e)})

    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.stop_auto_reconnect()
        await self.disconnect()