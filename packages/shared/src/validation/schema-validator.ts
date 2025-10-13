/**
 * Schema Validation Utilities
 * Provides JSON schema validation for both Python and Node.js implementations
 */

import Ajv, { ValidateFunction } from 'ajv';
import { MarketDataMessage, PerformanceMetrics } from '../types/market-data';

// Import JSON schemas
import marketDataSchema from '../schemas/market-data.schema.json';
import performanceMetricsSchema from '../schemas/performance-metrics.schema.json';

/**
 * Schema validator class using AJV
 */
export class SchemaValidator {
  private ajv: Ajv;
  private marketDataValidator: ValidateFunction<MarketDataMessage>;
  private performanceMetricsValidator: ValidateFunction<PerformanceMetrics>;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false
    });

    // Compile validators
    this.marketDataValidator = this.ajv.compile(marketDataSchema);
    this.performanceMetricsValidator = this.ajv.compile(performanceMetricsSchema);
  }

  /**
   * Validate market data message
   */
  validateMarketData(data: unknown): { valid: boolean; errors?: string[] } {
    const valid = this.marketDataValidator(data);
    
    if (!valid && this.marketDataValidator.errors) {
      const errors = this.marketDataValidator.errors.map(error => 
        `${error.instancePath || 'root'}: ${error.message}`
      );
      return { valid: false, errors };
    }
    
    return { valid: true };
  }

  /**
   * Validate performance metrics
   */
  validatePerformanceMetrics(data: unknown): { valid: boolean; errors?: string[] } {
    const valid = this.performanceMetricsValidator(data);
    
    if (!valid && this.performanceMetricsValidator.errors) {
      const errors = this.performanceMetricsValidator.errors.map(error => 
        `${error.instancePath || 'root'}: ${error.message}`
      );
      return { valid: false, errors };
    }
    
    return { valid: true };
  }

  /**
   * Get detailed validation errors
   */
  getValidationErrors(validator: ValidateFunction): string[] {
    if (!validator.errors) return [];
    
    return validator.errors.map(error => {
      const path = error.instancePath || 'root';
      const message = error.message || 'validation failed';
      const value = error.data !== undefined ? ` (received: ${JSON.stringify(error.data)})` : '';
      return `${path}: ${message}${value}`;
    });
  }

  /**
   * Validate and throw on error
   */
  validateMarketDataStrict(data: unknown): asserts data is MarketDataMessage {
    const result = this.validateMarketData(data);
    if (!result.valid) {
      throw new ValidationError('Market data validation failed', result.errors || []);
    }
  }

  /**
   * Validate performance metrics and throw on error
   */
  validatePerformanceMetricsStrict(data: unknown): asserts data is PerformanceMetrics {
    const result = this.validatePerformanceMetrics(data);
    if (!result.valid) {
      throw new ValidationError('Performance metrics validation failed', result.errors || []);
    }
  }
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  public readonly errors: string[];

  constructor(message: string, errors: string[]) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  toString(): string {
    return `${this.message}\nErrors:\n${this.errors.map(e => `  - ${e}`).join('\n')}`;
  }
}

/**
 * Singleton validator instance
 */
let validatorInstance: SchemaValidator | null = null;

/**
 * Get shared validator instance
 */
export function getValidator(): SchemaValidator {
  if (!validatorInstance) {
    validatorInstance = new SchemaValidator();
  }
  return validatorInstance;
}

/**
 * Convenience validation functions
 */
export const validateMarketData = (data: unknown) => getValidator().validateMarketData(data);
export const validatePerformanceMetrics = (data: unknown) => getValidator().validatePerformanceMetrics(data);
export const validateMarketDataStrict = (data: unknown) => getValidator().validateMarketDataStrict(data);
export const validatePerformanceMetricsStrict = (data: unknown) => getValidator().validatePerformanceMetricsStrict(data);

/**
 * Type guards using validation
 */
export function isMarketDataMessage(data: unknown): data is MarketDataMessage {
  return getValidator().validateMarketData(data).valid;
}

export function isPerformanceMetrics(data: unknown): data is PerformanceMetrics {
  return getValidator().validatePerformanceMetrics(data).valid;
}