-- PostgreSQL Database Schema for Financial Market Data Ingestion Benchmark
-- This schema is shared between Python and Node.js implementations

-- Create database (run separately if needed)
-- CREATE DATABASE finance_benchmark;

-- Market data table for historical storage
CREATE TABLE IF NOT EXISTS market_data (
    id BIGSERIAL PRIMARY KEY,
    message_id VARCHAR(50) NOT NULL,
    timestamp BIGINT NOT NULL, -- nanoseconds since epoch
    symbol VARCHAR(20) NOT NULL,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('TRADE', 'QUOTE', 'BOOK_UPDATE')),
    price DECIMAL(18,8) NOT NULL,
    quantity DECIMAL(18,8) NOT NULL,
    side VARCHAR(4) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    exchange VARCHAR(20) NOT NULL,
    sequence_number BIGINT NOT NULL,
    processing_latency_ns BIGINT, -- processing latency in nanoseconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_message_id UNIQUE (message_id),
    CONSTRAINT positive_price CHECK (price > 0),
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_sequence CHECK (sequence_number >= 0)
);

-- Performance metrics table for benchmark results
CREATE TABLE IF NOT EXISTS performance_metrics (
    id BIGSERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL, -- nanoseconds since epoch
    implementation VARCHAR(20) NOT NULL CHECK (implementation IN ('python', 'nodejs')),
    
    -- Latency metrics (all in nanoseconds)
    latency_p50 BIGINT,
    latency_p95 BIGINT,
    latency_p99 BIGINT,
    latency_p999 BIGINT,
    latency_min BIGINT,
    latency_max BIGINT,
    latency_mean BIGINT,
    latency_count BIGINT,
    
    -- Throughput metrics
    messages_per_second DECIMAL(12,2),
    bytes_per_second BIGINT,
    total_messages BIGINT,
    total_bytes BIGINT,
    
    -- Resource metrics
    cpu_usage DECIMAL(5,2), -- percentage
    memory_usage BIGINT, -- bytes
    memory_percent DECIMAL(5,2), -- percentage
    
    -- Network I/O metrics
    network_bytes_received BIGINT,
    network_bytes_sent BIGINT,
    network_packets_received BIGINT,
    network_packets_sent BIGINT,
    network_errors BIGINT,
    
    -- Garbage collection metrics (nullable for languages without GC)
    gc_collections BIGINT,
    gc_total_time_ms DECIMAL(10,3),
    gc_avg_time_ms DECIMAL(10,3),
    gc_max_time_ms DECIMAL(10,3),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Connection statistics table
CREATE TABLE IF NOT EXISTS connection_stats (
    id BIGSERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    implementation VARCHAR(20) NOT NULL CHECK (implementation IN ('python', 'nodejs')),
    is_connected BOOLEAN NOT NULL,
    connection_count INTEGER DEFAULT 0,
    reconnection_count INTEGER DEFAULT 0,
    last_connected_at BIGINT,
    last_disconnected_at BIGINT,
    latency_ms DECIMAL(10,3),
    packet_loss DECIMAL(5,4), -- percentage as decimal
    bandwidth_bytes_per_sec BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for optimal query performance

-- Market data indexes
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON market_data(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON market_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_market_data_message_type ON market_data(message_type);
CREATE INDEX IF NOT EXISTS idx_market_data_exchange ON market_data(exchange);
CREATE INDEX IF NOT EXISTS idx_market_data_created_at ON market_data(created_at);
CREATE INDEX IF NOT EXISTS idx_market_data_sequence ON market_data(sequence_number);

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_implementation ON performance_metrics(implementation);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_impl_timestamp ON performance_metrics(implementation, timestamp);

-- Connection stats indexes
CREATE INDEX IF NOT EXISTS idx_connection_stats_timestamp ON connection_stats(timestamp);
CREATE INDEX IF NOT EXISTS idx_connection_stats_implementation ON connection_stats(implementation);
CREATE INDEX IF NOT EXISTS idx_connection_stats_impl_timestamp ON connection_stats(implementation, timestamp);

-- Partitioning setup for large datasets (optional, uncomment if needed)
-- CREATE TABLE market_data_y2024m01 PARTITION OF market_data
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Views for common queries

-- Latest performance metrics by implementation
CREATE OR REPLACE VIEW latest_performance_metrics AS
SELECT DISTINCT ON (implementation)
    implementation,
    timestamp,
    latency_p50,
    latency_p95,
    latency_p99,
    latency_p999,
    messages_per_second,
    cpu_usage,
    memory_percent,
    created_at
FROM performance_metrics
ORDER BY implementation, timestamp DESC;

-- Market data summary by symbol
CREATE OR REPLACE VIEW market_data_summary AS
SELECT 
    symbol,
    COUNT(*) as message_count,
    MIN(timestamp) as first_message,
    MAX(timestamp) as last_message,
    AVG(processing_latency_ns) as avg_processing_latency_ns,
    MIN(processing_latency_ns) as min_processing_latency_ns,
    MAX(processing_latency_ns) as max_processing_latency_ns
FROM market_data
GROUP BY symbol;

-- Performance comparison view
CREATE OR REPLACE VIEW performance_comparison AS
SELECT 
    p.timestamp,
    p.implementation,
    p.latency_p99,
    p.messages_per_second,
    p.cpu_usage,
    p.memory_percent,
    LAG(p.latency_p99) OVER (PARTITION BY p.timestamp ORDER BY p.implementation) as other_latency_p99,
    LAG(p.messages_per_second) OVER (PARTITION BY p.timestamp ORDER BY p.implementation) as other_messages_per_second
FROM performance_metrics p
ORDER BY p.timestamp DESC, p.implementation;

-- Grant permissions (adjust as needed for your environment)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO benchmark_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO benchmark_user;