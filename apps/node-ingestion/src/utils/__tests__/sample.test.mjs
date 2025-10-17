/**
 * Test for sample.mjs module to verify coverage collection
 */

import { jest } from '@jest/globals'
import { add, multiply, Calculator } from '../sample.mjs'

describe('Sample MJS Module', () => {
  describe('add function', () => {
    test('should add two numbers correctly', () => {
      expect(add(2, 3)).toBe(5)
      expect(add(-1, 1)).toBe(0)
      expect(add(0, 0)).toBe(0)
    })
  })

  describe('multiply function', () => {
    test('should multiply two numbers correctly', () => {
      expect(multiply(2, 3)).toBe(6)
      expect(multiply(-1, 5)).toBe(-5)
      expect(multiply(0, 10)).toBe(0)
    })
  })

  describe('Calculator class', () => {
    let calculator

    beforeEach(() => {
      calculator = new Calculator()
    })

    test('should create calculator with empty history', () => {
      expect(calculator.getHistory()).toEqual([])
    })

    test('should perform addition and track history', () => {
      const result = calculator.calculate('add', 5, 3)
      expect(result).toBe(8)
      
      const history = calculator.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0]).toEqual({
        operation: 'add',
        a: 5,
        b: 3,
        result: 8
      })
    })

    test('should perform multiplication and track history', () => {
      const result = calculator.calculate('multiply', 4, 7)
      expect(result).toBe(28)
      
      const history = calculator.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0]).toEqual({
        operation: 'multiply',
        a: 4,
        b: 7,
        result: 28
      })
    })

    test('should throw error for unknown operation', () => {
      expect(() => {
        calculator.calculate('divide', 10, 2)
      }).toThrow('Unknown operation: divide')
    })

    test('should track multiple operations in history', () => {
      calculator.calculate('add', 1, 2)
      calculator.calculate('multiply', 3, 4)
      
      const history = calculator.getHistory()
      expect(history).toHaveLength(2)
      expect(history[0].operation).toBe('add')
      expect(history[1].operation).toBe('multiply')
    })
  })
})