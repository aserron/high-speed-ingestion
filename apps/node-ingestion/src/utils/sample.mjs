/**
 * Sample .mjs module for testing coverage collection
 */

export function add(a, b) {
  return a + b
}

export function multiply(a, b) {
  return a * b
}

export class Calculator {
  constructor() {
    this.history = []
  }

  calculate(operation, a, b) {
    let result
    switch (operation) {
      case 'add':
        result = add(a, b)
        break
      case 'multiply':
        result = multiply(a, b)
        break
      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
    
    this.history.push({ operation, a, b, result })
    return result
  }

  getHistory() {
    return [...this.history]
  }
}