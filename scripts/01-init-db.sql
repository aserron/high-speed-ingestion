-- Initialize database schema for finance benchmark
-- This script runs automatically when PostgreSQL container starts

-- Create database if it doesn't exist (handled by POSTGRES_DB env var)

-- Create market_data table for historical data storage
CREATE TABLE IF NOT EXISTS market_data (
    id BIGSERIAL PRIMARY KEY,
    message_id VARCHAR(50) NOT NULL,
    timestamp BIGINT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    price DECIMAL(18,8),
    quantity DECIMAL(18,8),
    side VARCHAR(4),
    exchange VARCHAR(20),
    sequence_number BIGINT,
    processing_latency_ns BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON market_data(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON market_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_market_data_message_type ON market_data(message_type);
CREATE INDEX IF NOT EXISTS idx_market_data_created_at ON market_data(created_at);

-- Create performance_metrics table for benchmark results
CREATE TABLE IF NOT EXISTS performance_metrics (
    id BIGSERIAL PRIMARY KEY,
    test_run_id VARCHAR(50) NOT NULL,
    implementation VARCHAR(20) NOT NULL, -- 'python' or 'nodejs'
    timestamp BIGINT NOT NULL,
    latency_p50_ns BIGINT,
    latency_p95_ns BIGINT,
    latency_p99_ns BIGINT,
    latency_p999_ns BIGINT,
    throughput_msg_per_sec DECIMAL(12,2),
    throughput_bytes_per_sec BIGINT,
    cpu_usage_percent DECIMAL(5,2),
    memory_usage_bytes BIGINT,
    network_io_bytes BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_test_run ON performance_metrics(test_run_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_impl ON performance_metrics(implementation);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- Create connection_stats table for monitoring WebSocket connections
CREATE TABLE IF NOT EXISTS connection_stats (
    id BIGSERIAL PRIMARY KEY,
    implementation VARCHAR(20) NOT NULL,
    connection_id VARCHAR(50) NOT NULL,
    timestamp BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'connected', 'disconnected', 'reconnecting'
    latency_ms DECIMAL(8,3),
    packet_loss_percent DECIMAL(5,2),
    bandwidth_bytes_per_sec BIGINT,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for connection stats
CREATE INDEX IF NOT EXISTS idx_connection_stats_impl ON connection_stats(implementation);
CREATE INDEX IF NOT EXISTS idx_connection_stats_connection_id ON connection_stats(connection_id);
CREATE INDEX IF NOT EXISTS idx_connection_stats_timestamp ON connection_stats(timestamp);

-- Grant permissions (postgres user already has full access)
-- Additional users can be added here if needed

-- Insert initial test data (optional)
-- This can be used for testing the schema
INSERT INTO market_data (
    message_id, timestamp, symbol, message_type, price, quantity, side, exchange, sequence_number, processing_latency_ns
) VALUES (
    'test-001', EXTRACT(EPOCH FROM NOW()) * 1000000000, 'AAPL', 'TRADE', 150.25, 100, 'BUY', 'NASDAQ', 1, 500000
) ON CONFLICT DO NOTHING;

-- Create a view for easy performance comparison
CREATE OR REPLACE VIEW performance_comparison AS
SELECT 
    test_run_id,
    implementation,
    AVG(latency_p50_ns) as avg_latency_p50_ns,
    AVG(latency_p95_ns) as avg_latency_p95_ns,
    AVG(latency_p99_ns) as avg_latency_p99_ns,
    AVG(latency_p999_ns) as avg_latency_p999_ns,
    AVG(throughput_msg_per_sec) as avg_throughput_msg_per_sec,
    AVG(cpu_usage_percent) as avg_cpu_usage_percent,
    AVG(memory_usage_bytes) as avg_memory_usage_bytes,
    COUNT(*) as sample_count,
    MIN(created_at) as test_start,
    MAX(created_at) as test_end
FROM performance_metrics 
GROUP BY test_run_id, implementation
ORDER BY test_run_id, implementation;