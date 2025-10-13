-- Development seed data for testing
-- This script runs after init-db.sql in development environment

-- Insert sample market data for testing
INSERT INTO market_data (
    message_id, timestamp, symbol, message_type, price, quantity, side, exchange, sequence_number, processing_latency_ns
) VALUES 
    ('dev-001', EXTRACT(EPOCH FROM NOW()) * 1000000000, 'AAPL', 'TRADE', 150.25, 100, 'BUY', 'NASDAQ', 1, 500000),
    ('dev-002', EXTRACT(EPOCH FROM NOW()) * 1000000000, 'GOOGL', 'TRADE', 2750.50, 50, 'SELL', 'NASDAQ', 2, 750000),
    ('dev-003', EXTRACT(EPOCH FROM NOW()) * 1000000000, 'MSFT', 'QUOTE', 330.75, 200, 'BUY', 'NYSE', 3, 300000),
    ('dev-004', EXTRACT(EPOCH FROM NOW()) * 1000000000, 'TSLA', 'TRADE', 245.80, 75, 'SELL', 'NASDAQ', 4, 600000),
    ('dev-005', EXTRACT(EPOCH FROM NOW()) * 1000000000, 'AMZN', 'BOOK_UPDATE', 3200.25, 25, 'BUY', 'NASDAQ', 5, 400000)
ON CONFLICT DO NOTHING;

-- Insert sample performance metrics for testing
INSERT INTO performance_metrics (
    test_run_id, implementation, timestamp, latency_p50_ns, latency_p95_ns, latency_p99_ns, latency_p999_ns,
    throughput_msg_per_sec, throughput_bytes_per_sec, cpu_usage_percent, memory_usage_bytes, network_io_bytes
) VALUES 
    ('dev-test-001', 'python', EXTRACT(EPOCH FROM NOW()) * 1000000000, 500000, 1000000, 2000000, 5000000, 8500.50, 1024000, 45.5, 2147483648, 10485760),
    ('dev-test-001', 'nodejs', EXTRACT(EPOCH FROM NOW()) * 1000000000, 450000, 900000, 1800000, 4500000, 9200.75, 1126400, 42.3, 1879048192, 11534336)
ON CONFLICT DO NOTHING;

-- Insert sample connection stats for testing
INSERT INTO connection_stats (
    implementation, connection_id, timestamp, status, latency_ms, packet_loss_percent, bandwidth_bytes_per_sec, error_count
) VALUES 
    ('python', 'py-conn-001', EXTRACT(EPOCH FROM NOW()) * 1000000000, 'connected', 12.5, 0.01, 1048576, 0),
    ('nodejs', 'js-conn-001', EXTRACT(EPOCH FROM NOW()) * 1000000000, 'connected', 11.8, 0.02, 1073741824, 0)
ON CONFLICT DO NOTHING;