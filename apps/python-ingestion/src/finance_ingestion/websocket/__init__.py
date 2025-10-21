"""
WebSocket Connection Management

High-performance WebSocket connection management with health monitoring,
exponential backoff reconnection, and comprehensive statistics tracking
for the Python financial data ingestion system.
"""

from .connection_manager import (
    ConnectionState,
    ConnectionStats,
    HeartbeatConfig,
    ReconnectionConfig,
    WebSocketConnectionManager,
)

# Alias for backward compatibility
ConnectionManager = WebSocketConnectionManager

__all__ = [
    'ConnectionManager',  # Alias
    'ConnectionState',
    'ConnectionStats',
    'HeartbeatConfig',
    'ReconnectionConfig',
    'WebSocketConnectionManager',
]
