"""
WebSocket Connection Management

High-performance WebSocket connection management with health monitoring,
exponential backoff reconnection, and comprehensive statistics tracking
for the Python financial data ingestion system.
"""

from .connection_manager import (
    WebSocketConnectionManager,
    ConnectionState,
    ConnectionStats,
    ReconnectionConfig,
    HeartbeatConfig,
)

# Alias for backward compatibility
ConnectionManager = WebSocketConnectionManager

__all__ = [
    'WebSocketConnectionManager',
    'ConnectionManager',  # Alias
    'ConnectionState', 
    'ConnectionStats',
    'ReconnectionConfig',
    'HeartbeatConfig',
]