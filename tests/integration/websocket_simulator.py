"""
WebSocket Data Feed Simulator for Integration Testing

Simulates realistic financial market data feeds for testing the ingestion systems.
Provides configurable message rates, burst patterns, and network failure simulation.
"""

import asyncio
import json
import time
import random
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
import websockets
import msgpack
from websockets.server import WebSocketServerProtocol


@dataclass
class MarketDataMessage:
    """Market data message structure"""
    messageId: str
    timestamp: int  # nanoseconds
    symbol: str
    messageType: str  # TRADE, QUOTE, BOOK_UPDATE
    data: Dict[str, Any]
    sequenceNumber: int


@dataclass
class SimulatorConfig:
    """Simulator configuration"""
    host: str = "localhost"
    port: int = 8765
    symbols: List[str] = None
    message_rate: int = 1000  # messages per second
    burst_rate: int = 5000  # messages per second during bursts
    burst_duration: float = 10.0  # seconds
    burst_interval: float = 60.0  # seconds between bursts
    price_volatility: float = 0.02  # 2% price volatility
    enable_network_failures: bool = False
    failure_rate: float = 0.001  # 0.1% failure rate
    serialization_format: str = "json"  # json or msgpack
    
    def __post_init__(self):
        if self.symbols is None:
            self.symbols = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "NFLX"]


class MarketDataGenerator:
    """Generates realistic market data messages"""
    
    def __init__(self, config: SimulatorConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Initialize symbol prices
        self.symbol_prices = {
            symbol: random.uniform(50.0, 500.0) 
            for symbol in config.symbols
        }
        
        # Message sequence counter
        self.sequence_number = 0
        
        # Message type probabilities
        self.message_type_weights = {
            "TRADE": 0.6,
            "QUOTE": 0.3,
            "BOOK_UPDATE": 0.1
        }
    
    def generate_message(self, symbol: str) -> MarketDataMessage:
        """Generate a single market data message"""
        self.sequence_number += 1
        
        # Select message type
        message_type = random.choices(
            list(self.message_type_weights.keys()),
            weights=list(self.message_type_weights.values())
        )[0]
        
        # Generate message data based on type
        if message_type == "TRADE":
            data = self._generate_trade_data(symbol)
        elif message_type == "QUOTE":
            data = self._generate_quote_data(symbol)
        else:  # BOOK_UPDATE
            data = self._generate_book_update_data(symbol)
        
        return MarketDataMessage(
            messageId=f"msg_{self.sequence_number}",
            timestamp=time.time_ns(),
            symbol=symbol,
            messageType=message_type,
            data=data,
            sequenceNumber=self.sequence_number
        )
    
    def _generate_trade_data(self, symbol: str) -> Dict[str, Any]:
        """Generate trade message data"""
        current_price = self.symbol_prices[symbol]
        
        # Apply price movement with volatility
        price_change = random.gauss(0, current_price * self.config.price_volatility)
        new_price = max(0.01, current_price + price_change)
        self.symbol_prices[symbol] = new_price
        
        return {
            "price": round(new_price, 2),
            "quantity": random.randint(100, 10000),
            "side": random.choice(["BUY", "SELL"]),
            "exchange": random.choice(["NYSE", "NASDAQ", "BATS"])
        }
    
    def _generate_quote_data(self, symbol: str) -> Dict[str, Any]:
        """Generate quote message data"""
        current_price = self.symbol_prices[symbol]
        spread = current_price * 0.001  # 0.1% spread
        
        return {
            "bid": round(current_price - spread/2, 2),
            "ask": round(current_price + spread/2, 2),
            "bidSize": random.randint(100, 5000),
            "askSize": random.randint(100, 5000),
            "exchange": random.choice(["NYSE", "NASDAQ", "BATS"])
        }
    
    def _generate_book_update_data(self, symbol: str) -> Dict[str, Any]:
        """Generate book update message data"""
        current_price = self.symbol_prices[symbol]
        
        # Generate multiple price levels
        levels = []
        for i in range(random.randint(1, 5)):
            price_offset = random.uniform(-0.05, 0.05) * current_price
            levels.append({
                "price": round(current_price + price_offset, 2),
                "quantity": random.randint(100, 2000),
                "side": random.choice(["BUY", "SELL"])
            })
        
        return {
            "levels": levels,
            "exchange": random.choice(["NYSE", "NASDAQ", "BATS"])
        }


class NetworkFailureSimulator:
    """Simulates network failures and connection issues"""
    
    def __init__(self, config: SimulatorConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.failure_active = False
        self.last_failure_time = 0
    
    def should_fail(self) -> bool:
        """Determine if a network failure should occur"""
        if not self.config.enable_network_failures:
            return False
        
        # Random failure based on failure rate
        if random.random() < self.config.failure_rate:
            self.failure_active = True
            self.last_failure_time = time.time()
            self.logger.info("Simulating network failure")
            return True
        
        # Recovery from failure after 1-5 seconds
        if self.failure_active and time.time() - self.last_failure_time > random.uniform(1, 5):
            self.failure_active = False
            self.logger.info("Recovering from network failure")
        
        return self.failure_active


class WebSocketDataFeedSimulator:
    """WebSocket server that simulates financial data feeds"""
    
    def __init__(self, config: SimulatorConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Components
        self.data_generator = MarketDataGenerator(config)
        self.failure_simulator = NetworkFailureSimulator(config)
        
        # Server state
        self.server = None
        self.connected_clients = set()
        self.running = False
        self.stats = {
            "messages_sent": 0,
            "clients_connected": 0,
            "failures_simulated": 0,
            "start_time": None
        }
        
        # Burst state
        self.in_burst = False
        self.last_burst_time = 0
    
    async def start_server(self):
        """Start the WebSocket server"""
        self.logger.info(f"Starting WebSocket simulator on {self.config.host}:{self.config.port}")
        
        self.server = await websockets.serve(
            self.handle_client,
            self.config.host,
            self.config.port
        )
        
        self.running = True
        self.stats["start_time"] = time.time()
        
        # Start message broadcasting task
        asyncio.create_task(self.broadcast_messages())
        
        self.logger.info("WebSocket simulator started successfully")
    
    async def stop_server(self):
        """Stop the WebSocket server"""
        self.logger.info("Stopping WebSocket simulator")
        
        self.running = False
        
        if self.server:
            self.server.close()
            await self.server.wait_closed()
        
        # Close all client connections
        if self.connected_clients:
            await asyncio.gather(
                *[client.close() for client in self.connected_clients],
                return_exceptions=True
            )
        
        self.logger.info("WebSocket simulator stopped")
    
    async def handle_client(self, websocket: WebSocketServerProtocol, path: str):
        """Handle new client connection"""
        client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        self.logger.info(f"Client connected: {client_id}")
        
        self.connected_clients.add(websocket)
        self.stats["clients_connected"] += 1
        
        try:
            # Send welcome message
            welcome_msg = {
                "type": "welcome",
                "message": "Connected to market data feed simulator",
                "symbols": self.config.symbols,
                "timestamp": time.time_ns()
            }
            await self.send_message(websocket, welcome_msg)
            
            # Keep connection alive
            async for message in websocket:
                # Handle client messages (subscription requests, etc.)
                try:
                    data = json.loads(message)
                    await self.handle_client_message(websocket, data)
                except json.JSONDecodeError:
                    self.logger.warning(f"Invalid JSON from client {client_id}")
                
        except websockets.exceptions.ConnectionClosed:
            self.logger.info(f"Client disconnected: {client_id}")
        except Exception as e:
            self.logger.error(f"Error handling client {client_id}: {e}")
        finally:
            self.connected_clients.discard(websocket)
    
    async def handle_client_message(self, websocket: WebSocketServerProtocol, message: Dict[str, Any]):
        """Handle message from client"""
        msg_type = message.get("type")
        
        if msg_type == "subscribe":
            symbols = message.get("symbols", [])
            response = {
                "type": "subscription_ack",
                "symbols": symbols,
                "timestamp": time.time_ns()
            }
            await self.send_message(websocket, response)
        
        elif msg_type == "ping":
            response = {
                "type": "pong",
                "timestamp": time.time_ns()
            }
            await self.send_message(websocket, response)
    
    async def broadcast_messages(self):
        """Broadcast market data messages to all connected clients"""
        while self.running:
            try:
                # Determine current message rate
                current_rate = self.get_current_message_rate()
                
                # Calculate delay between messages
                delay = 1.0 / current_rate if current_rate > 0 else 1.0
                
                # Generate and broadcast messages for each symbol
                for symbol in self.config.symbols:
                    if not self.running:
                        break
                    
                    # Check for network failure
                    if self.failure_simulator.should_fail():
                        self.stats["failures_simulated"] += 1
                        await asyncio.sleep(random.uniform(0.1, 1.0))
                        continue
                    
                    # Generate message
                    message = self.data_generator.generate_message(symbol)
                    
                    # Broadcast to all connected clients
                    await self.broadcast_to_clients(message)
                    
                    self.stats["messages_sent"] += 1
                    
                    # Wait before next message
                    await asyncio.sleep(delay / len(self.config.symbols))
                
            except Exception as e:
                self.logger.error(f"Error in message broadcasting: {e}")
                await asyncio.sleep(1.0)
    
    def get_current_message_rate(self) -> int:
        """Get current message rate (considering bursts)"""
        current_time = time.time()
        
        # Check if we should start a burst
        if (not self.in_burst and 
            current_time - self.last_burst_time > self.config.burst_interval):
            self.in_burst = True
            self.last_burst_time = current_time
            self.logger.info("Starting message burst")
        
        # Check if burst should end
        if (self.in_burst and 
            current_time - self.last_burst_time > self.config.burst_duration):
            self.in_burst = False
            self.logger.info("Ending message burst")
        
        return self.config.burst_rate if self.in_burst else self.config.message_rate
    
    async def broadcast_to_clients(self, message: MarketDataMessage):
        """Broadcast message to all connected clients"""
        if not self.connected_clients:
            return
        
        # Serialize message
        if self.config.serialization_format == "msgpack":
            data = msgpack.packb(asdict(message))
        else:
            data = json.dumps(asdict(message))
        
        # Send to all clients
        disconnected_clients = []
        
        for client in self.connected_clients:
            try:
                await client.send(data)
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.append(client)
            except Exception as e:
                self.logger.error(f"Error sending to client: {e}")
                disconnected_clients.append(client)
        
        # Remove disconnected clients
        for client in disconnected_clients:
            self.connected_clients.discard(client)
    
    async def send_message(self, websocket: WebSocketServerProtocol, message: Dict[str, Any]):
        """Send message to specific client"""
        try:
            if self.config.serialization_format == "msgpack":
                data = msgpack.packb(message)
            else:
                data = json.dumps(message)
            
            await websocket.send(data)
        except Exception as e:
            self.logger.error(f"Error sending message: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get simulator statistics"""
        uptime = time.time() - self.stats["start_time"] if self.stats["start_time"] else 0
        
        return {
            **self.stats,
            "uptime_seconds": uptime,
            "connected_clients": len(self.connected_clients),
            "messages_per_second": self.stats["messages_sent"] / uptime if uptime > 0 else 0,
            "current_rate": self.get_current_message_rate(),
            "in_burst": self.in_burst
        }


async def main():
    """Main function for running the simulator standalone"""
    logging.basicConfig(level=logging.INFO)
    
    config = SimulatorConfig(
        message_rate=1000,
        burst_rate=5000,
        enable_network_failures=True
    )
    
    simulator = WebSocketDataFeedSimulator(config)
    
    try:
        await simulator.start_server()
        
        # Run until interrupted
        while True:
            await asyncio.sleep(10)
            stats = simulator.get_stats()
            print(f"Stats: {stats}")
            
    except KeyboardInterrupt:
        print("Shutting down simulator...")
    finally:
        await simulator.stop_server()


if __name__ == "__main__":
    asyncio.run(main())