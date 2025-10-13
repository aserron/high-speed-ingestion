/**
 * End-to-End Integration Tests for Node.js
 *
 * Comprehensive tests for the complete data flow from WebSocket ingestion
 * to storage persistence with realistic market data workloads.
 */

import { performance } from 'perf_hooks'
import { WebSocketDataFeedSimulator } from '../integration/websocket_simulator.js'
import { FinanceIngestionApp } from '../../apps/node-ingestion/src/index.js'
import { getConfig } from '../../apps/node-ingestion/src/config/index.js'

class EndToEndIntegrationTest {
  constructor() {
    this.config = getConfig()
    this.app = null
    this.simulator = null
    this.testResults = {}
  }

  async setup() {
    console.log('Setting up end-to-end integration test environment...')
    
    // Initialize WebSocket simulator
    this.simulator = new WebSocketDataFeedSimulator({
      host: 'localhost',
      port: 8080,
      messageRate: 1000, // 1000 messages per second
      duration: 60 // 1 minute test
    })
    
    // Start simulator server
    await this.simulator.start()
    console.log('WebSocket simulator started')
    
    // Initialize application with test configuration
    const testConfig = { ...this.config }
    testConfig.websocket.url = 'ws://localhost:8080/market-data'
    testConfig.app.environment = 'test'
    
    this.app = new FinanceIngestionApp()
    this.app.config = testConfig
    await this.app.initialize()
    console.log('Application initialized')
  }

  async teardown() {
    console.log('Cleaning up test environment...')
    
    if (this.app) {
      await this.app.stop()
    }
    
    if (this.simulator) {
      await this.simulator.stop()
    }
    
    console.log('Cleanup completed')
  }

  async testCompleteDataFlow() {
    console.log('Testing complete data flow...')
    
    const startTime = performance.now()
    
    // Start application services
    await this.app.startServices()
    
    // Let it run for test duration
    await new Promise(resolve => setTimeout(resolve, 10000)) // 10 seconds
    
    // Stop services
    await this.app.stop()
    
    const endTime = performance.now()
    const duration = (endTime - startTime) / 1000
    
    // Collect metrics from services
    const storageService = this.app.services.get('storage')
    const processorService = this.app.services.get('processor')
    
    let messagesProcessed = 0
    let redisWrites = 0
    let postgresWrites = 0
    
    if (processorService && processorService.processor) {
      const stats = processorService.processor.getStats()
      messagesProcessed = stats.messagesProcessed || 0
    }
    
    if (storageService && storageService.manager) {
      const health = await storageService.manager.healthCheck()
      redisWrites = health.backends?.redis?.operations || 0
      postgresWrites = health.backends?.postgresql?.operations || 0
    }
    
    this.testResults.dataFlow = {
      duration,
      messagesProcessed,
      redisWrites,
      postgresWrites,
      processingRate: duration > 0 ? messagesProcessed / duration : 0,
      success: messagesProcessed > 0 && redisWrites > 0
    }
    
    console.log(`Data flow test completed: ${messagesProcessed} messages processed`)
    return this.testResults.dataFlow.success
  }

  async testErrorRecovery() {
    console.log('Testing error recovery mechanisms...')
    
    // Start application services
    await this.app.startServices()
    
    // Let it run normally first
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Simulate WebSocket disconnection
    await this.simulator.simulateDisconnection(3000)
    
    // Let recovery happen
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Stop services
    await this.app.stop()
    
    // Check recovery metrics
    const webSocketService = this.app.services.get('websocket')
    let reconnections = 0
    let errors = 0
    
    if (webSocketService && webSocketService.manager) {
      const stats = webSocketService.manager.getStats()
      reconnections = stats.reconnections || 0
      errors = stats.errors || 0
    }
    
    this.testResults.errorRecovery = {
      reconnections,
      errors,
      recoverySuccessful: reconnections > 0
    }
    
    console.log(`Error recovery test completed: ${reconnections} reconnections`)
    return this.testResults.errorRecovery.recoverySuccessful
  }

  async testHighLoadPerformance() {
    console.log('Testing high load performance...')
    
    // Configure high load
    await this.simulator.setMessageRate(5000) // 5000 messages/second
    
    const startTime = performance.now()
    
    // Start high load ingestion
    await this.app.startServices()
    
    // Run for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000))
    
    // Stop services
    await this.app.stop()
    
    const endTime = performance.now()
    const duration = (endTime - startTime) / 1000
    
    // Collect performance metrics
    const processorService = this.app.services.get('processor')
    let messagesProcessed = 0
    let p95Latency = 0
    let p99Latency = 0
    
    if (processorService && processorService.processor) {
      const stats = processorService.processor.getStats()
      messagesProcessed = stats.messagesProcessed || 0
      
      const latencyStats = stats.latencyStats || {}
      p95Latency = latencyStats.p95 || 0
      p99Latency = latencyStats.p99 || 0
    }
    
    const processingRate = duration > 0 ? messagesProcessed / duration : 0
    
    this.testResults.highLoad = {
      duration,
      messagesProcessed,
      processingRate,
      p95LatencyNs: p95Latency,
      p99LatencyNs: p99Latency,
      targetRateMet: processingRate >= 4000, // Should handle at least 4000/sec
      latencyTargetMet: p95Latency < 1_000_000 // < 1ms p95 latency
    }
    
    console.log(`High load test completed: ${processingRate.toFixed(0)} msg/sec, p95: ${(p95Latency/1000).toFixed(1)}μs`)
    return this.testResults.highLoad.targetRateMet && this.testResults.highLoad.latencyTargetMet
  }

  async testMemoryStability() {
    console.log('Testing memory stability...')
    
    const initialMemory = process.memoryUsage().heapUsed
    const memorySamples = [initialMemory]
    
    // Start services
    await this.app.startServices()
    
    // Monitor memory for 2 minutes
    for (let i = 0; i < 24; i++) { // 24 samples over 2 minutes
      await new Promise(resolve => setTimeout(resolve, 5000))
      const currentMemory = process.memoryUsage().heapUsed
      memorySamples.push(currentMemory)
    }
    
    // Stop services
    await this.app.stop()
    
    const finalMemory = process.memoryUsage().heapUsed
    const maxMemory = Math.max(...memorySamples)
    const memoryGrowth = finalMemory - initialMemory
    const memoryGrowthPercent = (memoryGrowth / initialMemory) * 100
    
    this.testResults.memoryStability = {
      initialMemoryMb: initialMemory / 1024 / 1024,
      finalMemoryMb: finalMemory / 1024 / 1024,
      maxMemoryMb: maxMemory / 1024 / 1024,
      memoryGrowthMb: memoryGrowth / 1024 / 1024,
      memoryGrowthPercent,
      stable: memoryGrowthPercent < 10 // Less than 10% growth
    }
    
    console.log(`Memory stability test completed: ${memoryGrowthPercent.toFixed(1)}% growth`)
    return this.testResults.memoryStability.stable
  }

  async runAllTests() {
    console.log('Starting comprehensive end-to-end integration tests...')
    
    try {
      await this.setup()
      
      // Run all tests
      const tests = [
        ['Complete Data Flow', () => this.testCompleteDataFlow()],
        ['Error Recovery', () => this.testErrorRecovery()],
        ['High Load Performance', () => this.testHighLoadPerformance()],
        ['Memory Stability', () => this.testMemoryStability()]
      ]
      
      const results = {}
      for (const [testName, testFunc] of tests) {
        console.log(`\n--- Running ${testName} Test ---`)
        try {
          const success = await testFunc()
          results[testName] = success
          console.log(`${testName}: ${success ? 'PASSED' : 'FAILED'}`)
        } catch (error) {
          console.log(`${testName}: FAILED - ${error.message}`)
          results[testName] = false
        }
      }
      
      // Print summary
      console.log('\n' + '='.repeat(50))
      console.log('END-TO-END INTEGRATION TEST SUMMARY')
      console.log('='.repeat(50))
      
      const passed = Object.values(results).filter(Boolean).length
      const total = Object.keys(results).length
      
      for (const [testName, success] of Object.entries(results)) {
        const status = success ? 'PASSED' : 'FAILED'
        console.log(`${testName.padEnd(30, '.')} ${status}`)
      }
      
      console.log(`\nOverall: ${passed}/${total} tests passed`)
      
      // Print detailed results
      if (Object.keys(this.testResults).length > 0) {
        console.log('\nDetailed Results:')
        console.log(JSON.stringify(this.testResults, null, 2))
      }
      
      return passed === total
      
    } finally {
      await this.teardown()
    }
  }
}

async function main() {
  const testSuite = new EndToEndIntegrationTest()
  const success = await testSuite.runAllTests()
  
  if (success) {
    console.log('\n🎉 All end-to-end integration tests PASSED!')
    return 0
  } else {
    console.log('\n❌ Some end-to-end integration tests FAILED!')
    return 1
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(exitCode => {
    process.exit(exitCode)
  }).catch(error => {
    console.error('Test execution failed:', error)
    process.exit(1)
  })
}

export { EndToEndIntegrationTest }