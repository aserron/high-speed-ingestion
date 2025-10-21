"""
WebSocket Connection Manager for Financial Data Ingestion

This module implements a high-performance WebSocket connection manager with:
- Robust connection handling with websockets library
- Health monitoring and heartbeat mechanism
- Exponential backoff reconnection with jitter
- Connection statistics tracking (latency, packet loss, bandwidth)
"""

import asyncio
import builtins
from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum
import random
import ssl
import time

import websockets
from websockets.exceptions import ConnectionClosed, InvalidHandshake, InvalidURI

from ..exceptions import ConnectionError, TimeoutError
from ..logging import get_logger


class ConnectionState(Enum):
    """WebSocket connection states."""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    CLOSING = "closing"
    CLOSED = "closed"


@dataclass
class ConnectionStats:
    """Connection statistics tracking."""
    connection_attempts: int = 0
    successful_connections: int = 0
    failed_connections: int = 0
    reconnection_attempts: int = 0
    messages_sent: int = 0
    messages_received: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0
    last_ping_latency_ms: float = 0.0
    average_latency_ms: float = 0.0
    packet_loss_rate: float = 0.0
    bandwidth_in_bps: float = 0.0
    bandwidth_out_bps: float = 0.0
    connection_uptime_seconds: float = 0.0
    last_connected_at: float | None = None
    last_disconnected_at: float | None = None

    def update_latency(self, latency_ms: float) -> None:
        """Update latency statistics."""
        self.last_ping_latency_ms = latency_ms
        # Simple moving average for demonstration
        if self.average_latency_ms == 0.0:
            self.average_latency_ms = latency_ms
        else:
            self.average_latency_ms = (self.average_latency_ms * 0.9) + (latency_ms * 0.1)


@dataclass
class ReconnectionConfig:
    """Reconnection strategy configuration."""
    initial_delay_ms: int = 100
    max_delay_ms: int = 30000
    multiplier: float = 2.0
    jitter_factor: float = 0.25
    max_attempts: int = 10
    reset_delay_after_success_seconds: int = 300


@dataclass
class HeartbeatConfig:
    """Heartbeat configuration."""
    enabled: bool = True
    interval_seconds: float = 30.0
    timeout_seconds: float = 10.0
    max_missed_heartbeats: int = 3


class WebSocketConnectionManager:
    """
    High-performance WebSocket connection manager for financial data feeds.
    
    Features:
    - Automatic reconnection with exponential backoff and jitter
    - Connection health monitoring with heartbeat mechanism
    - Comprehensive statistics tracking
    - Event-driven architecture with callbacks
    - SSL/TLS support for secure connections
    """

    def __init__(self,
                 url: str,
                 headers: dict[str, str] | None = None,
                 reconnection_config: ReconnectionConfig | None = None,
                 heartbeat_config: HeartbeatConfig | None = None,
                 ssl_context: ssl.SSLContext | None = None,
                 ping_interval: float | None = 20.0,
                 ping_timeout: float | None = 20.0,
                 close_timeout: float | None = 10.0):
        """
        Initialize the WebSocket connection manager.
        
        Args:
            url: WebSocket URL to connect to
            headers: Optional headers to send with connection
            reconnection_config: Reconnection strategy configuration
            heartbeat_config: Heartbeat monitoring configuration
            ssl_context: SSL context for secure connections
            ping_interval: WebSocket ping interval in seconds
            ping_timeout: WebSocket ping timeout in seconds
            close_timeout: Connection close timeout in seconds
        """
        self.url = url
        self.headers = headers or {}
        self.reconnection_config = reconnection_config or ReconnectionConfig()
        self.heartbeat_config = heartbeat_config or HeartbeatConfig()
        self.ssl_context = ssl_context
        self.ping_interval = ping_interval
        self.ping_timeout = ping_timeout
        self.close_timeout = close_timeout

        # Connection state
        self.state = ConnectionState.DISCONNECTED
        self.websocket: websockets.WebSocketServerProtocol | None = None
        self.connection_task: asyncio.Task | None = None
        self.heartbeat_task: asyncio.Task | None = None

        # Statistics and monitoring
        self.stats = ConnectionStats()
        self.latency_samples: list[float] = []
        self.max_latency_samples = 1000

        # Reconnection state
        self.current_delay_ms = self.reconnection_config.initial_delay_ms
        self.reconnection_attempts = 0
        self.last_successful_connection = None

        # Heartbeat state
        self.last_heartbeat_sent = None
        self.last_heartbeat_received = None
        self.missed_heartbeats = 0

        # Event callbacks
        self.on_connected: Callable | None = None
        self.on_disconnected: Callable | None = None
        self.on_message: Callable[[bytes], None] | None = None
        self.on_error: Callable[[Exception], None] | None = None

        # Control flags
        self._should_reconnect = True
        self._shutdown_requested = False

        self.logger = get_logger(__name__)
        self.logger.info(f"WebSocketConnectionManager initialized for {url}")

    async def connect(self) -> None:
        """
        Establish WebSocket connection with automatic reconnection.
        """
        if self.state in [ConnectionState.CONNECTING, ConnectionState.CONNECTED]:
            self.logger.warning("Connection already established or in progress")
            return

        self.state = ConnectionState.CONNECTING
        self.stats.connection_attempts += 1

        try:
            self.logger.info(f"Connecting to WebSocket: {self.url}")

            # Create WebSocket connection
            self.websocket = await websockets.connect(
                self.url,
                extra_headers=self.headers,
                ssl=self.ssl_context,
                ping_interval=self.ping_interval,
                ping_timeout=self.ping_timeout,
                close_timeout=self.close_timeout,
                max_size=None,  # No message size limit for high-frequency data
                compression=None  # Disable compression for lower latency
            )

            self.state = ConnectionState.CONNECTED
            self.stats.successful_connections += 1
            self.stats.last_connected_at = time.time()
            self.last_successful_connection = time.time()

            # Reset reconnection delay after successful connection
            self.current_delay_ms = self.reconnection_config.initial_delay_ms
            self.reconnection_attempts = 0

            self.logger.info("WebSocket connection established successfully")

            # Start heartbeat monitoring if enabled
            if self.heartbeat_config.enabled:
                self.heartbeat_task = asyncio.create_task(self._heartbeat_monitor())

            # Notify connection established
            if self.on_connected:
                try:
                    await self.on_connected()
                except Exception as e:
                    self.logger.error(f"Error in on_connected callback: {e}")

            # Start message receiving loop
            await self._message_loop()

        except (ConnectionClosed, InvalidURI, InvalidHandshake, OSError) as e:
            self.stats.failed_connections += 1
            self.state = ConnectionState.DISCONNECTED

            error_msg = f"WebSocket connection failed: {e}"
            self.logger.error(error_msg)

            if self.on_error:
                try:
                    await self.on_error(ConnectionError(error_msg, cause=e))
                except Exception as callback_error:
                    self.logger.error(f"Error in on_error callback: {callback_error}")

            # Attempt reconnection if enabled
            if self._should_reconnect and not self._shutdown_requested:
                await self._schedule_reconnection()

        except Exception as e:
            self.stats.failed_connections += 1
            self.state = ConnectionState.DISCONNECTED

            error_msg = f"Unexpected connection error: {e}"
            self.logger.error(error_msg)

            if self.on_error:
                try:
                    await self.on_error(ConnectionError(error_msg, cause=e))
                except Exception as callback_error:
                    self.logger.error(f"Error in on_error callback: {callback_error}")

    async def disconnect(self) -> None:
        """
        Gracefully disconnect from WebSocket.
        """
        self.logger.info("Initiating WebSocket disconnection")

        self._should_reconnect = False
        self.state = ConnectionState.CLOSING

        # Cancel heartbeat monitoring
        if self.heartbeat_task and not self.heartbeat_task.done():
            self.heartbeat_task.cancel()
            try:
                await self.heartbeat_task
            except asyncio.CancelledError:
                pass

        # Close WebSocket connection
        if self.websocket and not self.websocket.closed:
            try:
                await self.websocket.close()
            except Exception as e:
                self.logger.warning(f"Error closing WebSocket: {e}")

        self.state = ConnectionState.CLOSED
        self.stats.last_disconnected_at = time.time()

        # Notify disconnection
        if self.on_disconnected:
            try:
                await self.on_disconnected()
            except Exception as e:
                self.logger.error(f"Error in on_disconnected callback: {e}")

        self.logger.info("WebSocket disconnected successfully")

    async def send_message(self, message: bytes) -> None:
        """
        Send message through WebSocket connection.
        
        Args:
            message: Message bytes to send
            
        Raises:
            ConnectionError: If not connected or send fails
        """
        if self.state != ConnectionState.CONNECTED or not self.websocket:
            raise ConnectionError("WebSocket not connected")

        try:
            await self.websocket.send(message)
            self.stats.messages_sent += 1
            self.stats.bytes_sent += len(message)

        except ConnectionClosed as e:
            self.logger.warning("Connection closed while sending message")
            raise ConnectionError("Connection closed during send", cause=e)
        except Exception as e:
            self.logger.error(f"Failed to send message: {e}")
            raise ConnectionError(f"Send failed: {e}", cause=e)

    async def _message_loop(self) -> None:
        """
        Main message receiving loop.
        """
        try:
            async for message in self.websocket:
                if isinstance(message, bytes):
                    self.stats.messages_received += 1
                    self.stats.bytes_received += len(message)

                    # Update bandwidth statistics
                    self._update_bandwidth_stats()

                    # Process message through callback
                    if self.on_message:
                        try:
                            await self.on_message(message)
                        except Exception as e:
                            self.logger.error(f"Error in message callback: {e}")
                            if self.on_error:
                                await self.on_error(e)

        except ConnectionClosed:
            self.logger.info("WebSocket connection closed by server")
        except Exception as e:
            self.logger.error(f"Error in message loop: {e}")
            if self.on_error:
                await self.on_error(e)
        finally:
            self.state = ConnectionState.DISCONNECTED
            self.stats.last_disconnected_at = time.time()

            # Notify disconnection
            if self.on_disconnected:
                try:
                    await self.on_disconnected()
                except Exception as e:
                    self.logger.error(f"Error in on_disconnected callback: {e}")

    async def _heartbeat_monitor(self) -> None:
        """
        Monitor connection health with heartbeat mechanism.
        """
        try:
            while self.state == ConnectionState.CONNECTED and self.websocket:
                await asyncio.sleep(self.heartbeat_config.interval_seconds)

                if self.state != ConnectionState.CONNECTED:
                    break

                try:
                    # Send ping and measure latency
                    start_time = time.perf_counter()
                    pong_waiter = await self.websocket.ping()
                    await asyncio.wait_for(pong_waiter, timeout=self.heartbeat_config.timeout_seconds)

                    # Calculate latency
                    latency_ms = (time.perf_counter() - start_time) * 1000
                    self.stats.update_latency(latency_ms)

                    # Store latency sample
                    self.latency_samples.append(latency_ms)
                    if len(self.latency_samples) > self.max_latency_samples:
                        self.latency_samples.pop(0)

                    self.last_heartbeat_sent = time.time()
                    self.last_heartbeat_received = time.time()
                    self.missed_heartbeats = 0

                    self.logger.debug(f"Heartbeat successful, latency: {latency_ms:.2f}ms")

                except builtins.TimeoutError:
                    self.missed_heartbeats += 1
                    self.logger.warning(f"Heartbeat timeout, missed: {self.missed_heartbeats}")

                    if self.missed_heartbeats >= self.heartbeat_config.max_missed_heartbeats:
                        self.logger.error("Too many missed heartbeats, connection unhealthy")
                        if self.on_error:
                            await self.on_error(TimeoutError("Heartbeat timeout"))
                        break

                except Exception as e:
                    self.logger.error(f"Heartbeat error: {e}")
                    if self.on_error:
                        await self.on_error(e)
                    break

        except asyncio.CancelledError:
            self.logger.debug("Heartbeat monitor cancelled")
        except Exception as e:
            self.logger.error(f"Heartbeat monitor error: {e}")

    async def _schedule_reconnection(self) -> None:
        """
        Schedule reconnection with exponential backoff and jitter.
        """
        if not self._should_reconnect or self._shutdown_requested:
            return

        if self.reconnection_attempts >= self.reconnection_config.max_attempts:
            self.logger.error(f"Max reconnection attempts ({self.reconnection_config.max_attempts}) reached")
            return

        self.state = ConnectionState.RECONNECTING
        self.reconnection_attempts += 1
        self.stats.reconnection_attempts += 1

        # Calculate delay with jitter
        jitter = random.uniform(-self.reconnection_config.jitter_factor,
                               self.reconnection_config.jitter_factor)
        delay_ms = self.current_delay_ms * (1 + jitter)
        delay_seconds = delay_ms / 1000

        self.logger.info(f"Scheduling reconnection attempt {self.reconnection_attempts} "
                        f"in {delay_seconds:.2f} seconds")

        # Wait for delay
        try:
            await asyncio.sleep(delay_seconds)
        except asyncio.CancelledError:
            return

        # Update delay for next attempt
        self.current_delay_ms = min(
            self.current_delay_ms * self.reconnection_config.multiplier,
            self.reconnection_config.max_delay_ms
        )

        # Attempt reconnection
        if self._should_reconnect and not self._shutdown_requested:
            await self.connect()

    def _update_bandwidth_stats(self) -> None:
        """
        Update bandwidth statistics based on recent activity.
        """
        current_time = time.time()

        if self.stats.last_connected_at:
            uptime = current_time - self.stats.last_connected_at
            self.stats.connection_uptime_seconds = uptime

            if uptime > 0:
                self.stats.bandwidth_in_bps = self.stats.bytes_received / uptime
                self.stats.bandwidth_out_bps = self.stats.bytes_sent / uptime

    def get_connection_stats(self) -> ConnectionStats:
        """
        Get current connection statistics.
        
        Returns:
            ConnectionStats object with current statistics
        """
        # Update uptime before returning stats
        self._update_bandwidth_stats()

        # Calculate packet loss rate from heartbeat data
        if self.stats.connection_attempts > 0:
            self.stats.packet_loss_rate = (
                self.missed_heartbeats / max(1, self.stats.connection_attempts)
            )

        return self.stats

    def get_latency_percentiles(self) -> dict[str, float]:
        """
        Calculate latency percentiles from recent samples.
        
        Returns:
            Dictionary with percentile values
        """
        if not self.latency_samples:
            return {"p50": 0.0, "p95": 0.0, "p99": 0.0, "p999": 0.0}

        sorted_samples = sorted(self.latency_samples)
        n = len(sorted_samples)

        return {
            "p50": sorted_samples[int(n * 0.50)],
            "p95": sorted_samples[int(n * 0.95)],
            "p99": sorted_samples[int(n * 0.99)],
            "p999": sorted_samples[int(n * 0.999)] if n >= 1000 else sorted_samples[-1]
        }

    def is_connected(self) -> bool:
        """
        Check if WebSocket is currently connected.
        
        Returns:
            True if connected, False otherwise
        """
        return (self.state == ConnectionState.CONNECTED and
                self.websocket and
                not self.websocket.closed)

    def is_healthy(self) -> bool:
        """
        Check if connection is healthy based on heartbeat status.
        
        Returns:
            True if connection is healthy, False otherwise
        """
        if not self.is_connected():
            return False

        if not self.heartbeat_config.enabled:
            return True

        return self.missed_heartbeats < self.heartbeat_config.max_missed_heartbeats

    async def shutdown(self) -> None:
        """
        Shutdown the connection manager gracefully.
        """
        self.logger.info("Shutting down WebSocket connection manager")

        self._shutdown_requested = True
        self._should_reconnect = False

        # Cancel any pending reconnection
        if self.connection_task and not self.connection_task.done():
            self.connection_task.cancel()
            try:
                await self.connection_task
            except asyncio.CancelledError:
                pass

        # Disconnect if connected
        if self.is_connected():
            await self.disconnect()

        self.logger.info("WebSocket connection manager shutdown complete")
