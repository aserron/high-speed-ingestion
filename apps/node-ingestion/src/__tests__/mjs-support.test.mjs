/**
 * Test to verify .mjs file support in Jest configuration
 */

import { jest } from '@jest/globals'

describe('MJS File Support', () => {
  test('should run tests from .mjs files', () => {
    expect(true).toBe(true)
  })

  test('should support ES modules in .mjs files', async () => {
    const { performance } = await import('perf_hooks')
    expect(performance).toBeDefined()
    expect(typeof performance.now).toBe('function')
  })

  test('should support dynamic imports in .mjs files', async () => {
    const crypto = await import('crypto')
    expect(crypto.randomUUID).toBeDefined()
    
    const uuid = crypto.randomUUID()
    expect(typeof uuid).toBe('string')
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })
})