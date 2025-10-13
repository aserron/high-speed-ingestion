"""
End-to-End Integration Tests

Comprehensive tests for the complete data flow from WebSocket ingestion
to storage persistence with realistic market data workloads.
"""

import asyncio
import json
import time
import pytest
import websockets
from typing import Dict, List, Any
import msgpack
import random
import string

from apps.python_ingestion.src.finance_ingestion.main import FinanceIngestionApp
from apps.python_ingestion.src.finance_ingestion.config import get_config
from tests.integration.websocket_simulator import WebSocketDataFeedSimulator


class EndToEndIntegrationTest:
    """End-to-end integration test suite"""
    
    def __init__(self):
        self.config = get_config()
        self.app = None
        self.simulator = None
        self.test_results = {}
        
    async def setup(self):
        """Setup test environment"""
        print("Setting up end-to-end integration test environment...")
        
        # Initialize WebSocket simulator
        self.simulator = WebSocketDataFeedSimulator(
            host='localhost',
            port=8080,
            message_rate=1000,  # 1000 messages per second
            duration=60  # 1 minute test
        )
        
        # Start simulator server
        await self.simulator.start()
        print("WebSocket simulator started")
        
        # Initialize application with test configuration
        test_config = self.config.copy()
        test_config['websocket']['url'] = 'ws://localhost:8080/market-data'
        test_config['environment'] = 'test'
        
        self.app = FinanceIngestionApp(test_config)
        await self.app.initialize()
        print("Application initialized")
        
    async def teardown(self):
        """Cleanup test environment"""
        print("Cleaning up test environment...")
        
        if self.app:
            await self.app.cleanup()
            
        if self.simulator:
            await self.simulator.stop()
            
        print("Cleanup completed")
        
    async def test_complete_data_flow(self):
        """Test complete data flow from WebSocket to storage"""
        print("Testing complete data flow...")
        
        start_time = time.time()
        
        # Start application ingestion
        ingestion_task = asyncio.create_task(self.app._run_ingestion_loop())
        
        # Let it run for test duration
        await asyncio.sleep(10)  # 10 seconds of data ingestion
        
        # Stop ingestion
        self.app.shutdown_event.set()
        await ingestion_task
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Collect metrics
        metrics = self.app.metrics_collector.get_all_stats()
        storage_metrics = self.app.storage_manager.get_metrics()
        
        # Verify data flow
        messages_processed = metrics.get('messages_processed_total', 0)
        redis_writes = storage_metrics.get('redis_writes', 0)
        postgres_writes = storage_metrics.get('postgres_writes', 0)
        
        self.test_results['data_flow'] = {
            'duration': duration,
            'messages_processed': messages_processed,
            'redis_writes': redis_writes,
            'postgres_writes': postgres_writes,
            'processing_rate': messages_processed / duration if duration > 0 else 0,
            'success': messages_processed > 0 and redis_writes > 0
        }
        
        print(f"Data flow test completed: {messages_processed} messages processed")
        return self.test_results['data_flow']['success']
        
    async def test_error_recovery(self):
        """Test error handling and recovery mechanisms"""
        print("Testing error recovery mechanisms...")
        
        # Start application
        ingestion_task = asyncio.create_task(self.app._run_ingestion_loop())
        
        # Let it run normally first
        await asyncio.sleep(2)
        
        # Simulate WebSocket disconnection
        await self.simulator.simulate_disconnection(duration=3)
        
        # Let recovery happen
        await asyncio.sleep(5)
        
        # Stop test
        self.app.shutdown_event.set()
        await ingestion_task
        
        # Check recovery metrics
        metrics = self.app.metrics_collector.get_all_stats()
        reconnections = metrics.get('websocket_reconnections_total', 0)
        errors = metrics.get('websocket_errors_total', 0)
        
        self.test_results['error_recovery'] = {
            'reconnections': reconnections,
            'errors': errors,
            'recovery_successful': reconnections > 0
        }
        
        print(f"Error recovery test completed: {reconnections} reconnections")
        return self.test_results['error_recovery']['recovery_successful']
        
    async def test_high_load_performance(self):
        """Test system performance under high load"""
        print("Testing high load performance...")
        
        # Configure high load
        await self.simulator.set_message_rate(5000)  # 5000 messages/second
        
        start_time = time.time()
        
        # Start high load ingestion
        ingestion_task = asyncio.create_task(self.app._run_ingestion_loop())
        
        # Run for 30 seconds
        await asyncio.sleep(30)
        
        # Stop ingestion
        self.app.shutdown_event.set()
        await ingestion_task
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Collect performance metrics
        metrics = self.app.metrics_collector.get_all_stats()
        latency_stats = self.app.metrics_collector.get_latency_stats()
        
        messages_processed = metrics.get('messages_processed_total', 0)
        processing_rate = messages_processed / duration if duration > 0 else 0
        
        # Get latency percentiles
        p95_latency = latency_stats.get('message_processing', {}).get('p95', 0)
        p99_latency = latency_stats.get('message_processing', {}).get('p99', 0)
        
        self.test_results['high_load'] = {
            'duration': duration,
            'messages_processed': messages_processed,
            'processing_rate': processing_rate,
            'p95_latency_ns': p95_latency,
            'p99_latency_ns': p99_latency,
            'target_rate_met': processing_rate >= 4000,  # Should handle at least 4000/sec
            'latency_target_met': p95_latency < 1_000_000  # < 1ms p95 latency
        }
        
        print(f"High load test completed: {processing_rate:.0f} msg/sec, p95: {p95_latency/1000:.1f}μs")
        return (self.test_results['high_load']['target_rate_met'] and 
                self.test_results['high_load']['latency_target_met'])
        
    async def test_memory_stability(self):
        """Test memory stability over extended period"""
        print("Testing memory stability...")
        
        import psutil
        process = psutil.Process()
        
        initial_memory = process.memory_info().rss
        memory_samples = [initial_memory]
        
        # Start ingestion
        ingestion_task = asyncio.create_task(self.app._run_ingestion_loop())
        
        # Monitor memory for 2 minutes
        for i in range(24):  # 24 samples over 2 minutes
            await asyncio.sleep(5)
            current_memory = process.memory_info().rss
            memory_samples.append(current_memory)
            
        # Stop ingestion
        self.app.shutdown_event.set()
        await ingestion_task
        
        final_memory = process.memory_info().rss
        max_memory = max(memory_samples)
        memory_growth = final_memory - initial_memory
        memory_growth_percent = (memory_growth / initial_memory) * 100
        
        self.test_results['memory_stability'] = {
            'initial_memory_mb': initial_memory / 1024 / 1024,
            'final_memory_mb': final_memory / 1024 / 1024,
            'max_memory_mb': max_memory / 1024 / 1024,
            'memory_growth_mb': memory_growth / 1024 / 1024,
            'memory_growth_percent': memory_growth_percent,
            'stable': memory_growth_percent < 10  # Less than 10% growth
        }
        
        print(f"Memory stability test completed: {memory_growth_percent:.1f}% growth")
        return self.test_results['memory_stability']['stable']
        
    async def run_all_tests(self):
        """Run all end-to-end tests"""
        print("Starting comprehensive end-to-end integration tests...")
        
        try:
            await self.setup()
            
            # Run all tests
            tests = [
                ('Complete Data Flow', self.test_complete_data_flow),
                ('Error Recovery', self.test_error_recovery),
                ('High Load Performance', self.test_high_load_performance),
                ('Memory Stability', self.test_memory_stability)
            ]
            
            results = {}
            for test_name, test_func in tests:
                print(f"\n--- Running {test_name} Test ---")
                try:
                    success = await test_func()
                    results[test_name] = success
                    print(f"{test_name}: {'PASSED' if success else 'FAILED'}")
                except Exception as e:
                    print(f"{test_name}: FAILED - {e}")
                    results[test_name] = False
                    
            # Print summary
            print("\n" + "="*50)
            print("END-TO-END INTEGRATION TEST SUMMARY")
            print("="*50)
            
            passed = sum(results.values())
            total = len(results)
            
            for test_name, success in results.items():
                status = "PASSED" if success else "FAILED"
                print(f"{test_name:.<30} {status}")
                
            print(f"\nOverall: {passed}/{total} tests passed")
            
            # Print detailed results
            if self.test_results:
                print("\nDetailed Results:")
                print(json.dumps(self.test_results, indent=2))
                
            return passed == total
            
        finally:
            await self.teardown()


async def main():
    """Main test runner"""
    test_suite = EndToEndIntegrationTest()
    success = await test_suite.run_all_tests()
    
    if success:
        print("\n🎉 All end-to-end integration tests PASSED!")
        return 0
    else:
        print("\n❌ Some end-to-end integration tests FAILED!")
        return 1


if __name__ == '__main__':
    import sys
    exit_code = asyncio.run(main())
    sys.exit(exit_code)