#!/usr/bin/env node

/**
 * Quality control script for Node.js application.
 * 
 * This script provides unified commands for code quality checks and fixes.
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Run a command and return a promise.
 */
function runCommand(cmd, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${cmd} ${args.join(' ')}`)
    
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(code)
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })
    
    child.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Run all quality checks.
 */
async function checkAll() {
  console.log('🔍 Running comprehensive quality checks...')
  
  let exitCode = 0
  
  try {
    // ESLint check
    console.log('\n📋 Running ESLint...')
    await runCommand('npm', ['run', 'lint:check'])
  } catch (error) {
    console.error('❌ ESLint check failed')
    exitCode = 1
  }
  
  try {
    // Prettier check
    console.log('\n🎨 Checking code formatting...')
    await runCommand('npm', ['run', 'format:check'])
  } catch (error) {
    console.error('❌ Prettier check failed')
    exitCode = 1
  }
  
  try {
    // Security audit
    console.log('\n🔒 Running security audit...')
    await runCommand('npm', ['run', 'security:check'])
  } catch (error) {
    console.error('❌ Security audit failed')
    exitCode = 1
  }
  
  try {
    // Test coverage
    console.log('\n🧪 Running tests with coverage...')
    await runCommand('npm', ['run', 'test:coverage'])
  } catch (error) {
    console.error('❌ Tests failed')
    exitCode = 1
  }
  
  if (exitCode === 0) {
    console.log('\n✅ All quality checks passed!')
  } else {
    console.log('\n❌ Some quality checks failed!')
  }
  
  return exitCode
}

/**
 * Run all auto-fixable quality improvements.
 */
async function fixAll() {
  console.log('🔧 Running auto-fixes...')
  
  let exitCode = 0
  
  try {
    // ESLint auto-fix
    console.log('\n🔧 Running ESLint auto-fixes...')
    await runCommand('npm', ['run', 'lint:fix'])
  } catch (error) {
    console.error('❌ ESLint fix failed')
    exitCode = 1
  }
  
  try {
    // Prettier formatting
    console.log('\n🎨 Formatting code...')
    await runCommand('npm', ['run', 'format:fix'])
  } catch (error) {
    console.error('❌ Prettier formatting failed')
    exitCode = 1
  }
  
  if (exitCode === 0) {
    console.log('\n✅ All auto-fixes applied!')
  } else {
    console.log('\n⚠️  Some fixes could not be applied automatically')
  }
  
  return exitCode
}

/**
 * Run linting checks only.
 */
async function lintCheck() {
  console.log('📋 Running linting checks...')
  try {
    await runCommand('npm', ['run', 'lint:check'])
    return 0
  } catch (error) {
    return 1
  }
}

/**
 * Run linting fixes only.
 */
async function lintFix() {
  console.log('🔧 Running linting fixes...')
  try {
    await runCommand('npm', ['run', 'lint:fix'])
    return 0
  } catch (error) {
    return 1
  }
}

/**
 * Check code formatting.
 */
async function formatCheck() {
  console.log('🎨 Checking code formatting...')
  try {
    await runCommand('npm', ['run', 'format:check'])
    return 0
  } catch (error) {
    return 1
  }
}

/**
 * Fix code formatting.
 */
async function formatFix() {
  console.log('🎨 Formatting code...')
  try {
    await runCommand('npm', ['run', 'format:fix'])
    return 0
  } catch (error) {
    return 1
  }
}

/**
 * Run security checks.
 */
async function securityCheck() {
  console.log('🔒 Running security checks...')
  try {
    await runCommand('npm', ['run', 'security:check'])
    return 0
  } catch (error) {
    return 1
  }
}

/**
 * Run tests.
 */
async function testRun() {
  console.log('🧪 Running tests...')
  try {
    await runCommand('npm', ['run', 'test'])
    return 0
  } catch (error) {
    return 1
  }
}

/**
 * Main entry point.
 */
async function main() {
  const command = process.argv[2]
  
  if (!command) {
    console.log('Usage: node quality.js <command>')
    console.log('Commands:')
    console.log('  check        - Run all quality checks')
    console.log('  fix          - Run all auto-fixes')
    console.log('  lint:check   - Run linting checks')
    console.log('  lint:fix     - Run linting fixes')
    console.log('  format:check - Check code formatting')
    console.log('  format:fix   - Fix code formatting')
    console.log('  security     - Run security checks')
    console.log('  test         - Run tests')
    process.exit(1)
  }
  
  const commands = {
    'check': checkAll,
    'fix': fixAll,
    'lint:check': lintCheck,
    'lint:fix': lintFix,
    'format:check': formatCheck,
    'format:fix': formatFix,
    'security': securityCheck,
    'test': testRun,
  }
  
  if (!(command in commands)) {
    console.error(`Unknown command: ${command}`)
    process.exit(1)
  }
  
  try {
    const exitCode = await commands[command]()
    process.exit(exitCode)
  } catch (error) {
    console.error(`Command failed: ${error.message}`)
    process.exit(1)
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}