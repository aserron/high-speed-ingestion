/**
 * ESLint configuration using modern flat config format.
 * Uses @eslint/js recommended configuration with additional rules for Node.js.
 */

import js from '@eslint/js'
import globals from 'globals'

export default [
  // Base recommended configuration
  js.configs.recommended,
  
  // Main configuration
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      }
    },
    
    rules: {
      // Code quality rules
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-console': 'off', // Allow console in Node.js applications
      
      // ES6+ rules
      'arrow-spacing': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'template-curly-spacing': 'error',
      
      // Best practices
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'dot-notation': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-new-wrappers': 'error',
      'no-throw-literal': 'error',
      'radix': 'error',
      'yoda': 'error',
      
      // Node.js specific
      'no-process-exit': 'error',
      'no-sync': 'warn',
      
      // Async/await
      'require-await': 'error',
      'no-return-await': 'error',
      
      // Error handling
      'no-empty-catch': 'error',
      
      // Code style (handled by Prettier, but some logical rules)
      'max-len': ['warn', { 
        code: 100, 
        ignoreUrls: true, 
        ignoreStrings: true,
        ignoreTemplateLiterals: true
      }],
      'max-params': ['warn', 6],
      'max-depth': ['warn', 4],
      'complexity': ['warn', 12],
      
      // Import/export
      'no-duplicate-imports': 'error',
      
      // Security
      'no-new-require': 'error',
      'no-path-concat': 'error',
    }
  },
  
  // Test files configuration
  {
    files: ['**/*.test.js', '**/*.spec.js', '**/tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      }
    },
    rules: {
      // Relax some rules for test files
      'max-len': 'off',
      'no-unused-expressions': 'off',
      'prefer-arrow-callback': 'off', // Mocha/Jest often use function expressions
    }
  },
  
  // CLI files configuration
  {
    files: ['**/cli.js', '**/scripts/**/*.js'],
    rules: {
      'no-console': 'off', // CLI tools need console output
      'no-process-exit': 'off', // CLI tools may need to exit
    }
  },
  
  // Configuration files
  {
    files: ['**/*.config.js', '**/config/**/*.js'],
    rules: {
      'no-console': 'off', // Config files may log information
    }
  }
]