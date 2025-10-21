#!/usr/bin/env python3
"""
Quality control script for Python application.

This script provides unified commands for code quality checks and fixes.
"""

import subprocess
import sys
from pathlib import Path
from typing import List, Optional


def run_command(cmd: List[str], check: bool = True, cwd: Optional[Path] = None) -> subprocess.CompletedProcess:
    """Run a command and return the result."""
    print(f"Running: {' '.join(cmd)}")
    try:
        result = subprocess.run(cmd, check=check, cwd=cwd, capture_output=False)
        return result
    except subprocess.CalledProcessError as e:
        print(f"Command failed with exit code {e.returncode}")
        if check:
            sys.exit(e.returncode)
        return e


def check_all() -> int:
    """Run all quality checks."""
    print("🔍 Running comprehensive quality checks...")
    
    exit_code = 0
    
    # Ruff linting
    print("\n📋 Running Ruff linting...")
    result = run_command(["ruff", "check", "src", "tests"], check=False)
    if result.returncode != 0:
        exit_code = 1
    
    # Ruff formatting check
    print("\n🎨 Checking code formatting...")
    result = run_command(["ruff", "format", "--check", "src", "tests"], check=False)
    if result.returncode != 0:
        exit_code = 1
    
    # MyPy type checking
    print("\n🔍 Running MyPy type checking...")
    result = run_command(["mypy", "src"], check=False)
    if result.returncode != 0:
        exit_code = 1
    
    # Bandit security check
    print("\n🔒 Running Bandit security check...")
    result = run_command(["bandit", "-r", "src", "-f", "json", "-o", "bandit-report.json"], check=False)
    if result.returncode != 0:
        print("⚠️  Security issues found - check bandit-report.json")
        exit_code = 1
    
    # Safety dependency check
    print("\n🛡️  Checking dependencies for security vulnerabilities...")
    result = run_command(["safety", "check", "--json", "--output", "safety-report.json"], check=False)
    if result.returncode != 0:
        print("⚠️  Vulnerable dependencies found - check safety-report.json")
        exit_code = 1
    
    if exit_code == 0:
        print("\n✅ All quality checks passed!")
    else:
        print("\n❌ Some quality checks failed!")
    
    return exit_code


def fix_all() -> int:
    """Run all auto-fixable quality improvements."""
    print("🔧 Running auto-fixes...")
    
    exit_code = 0
    
    # Ruff auto-fix
    print("\n🔧 Running Ruff auto-fixes...")
    result = run_command(["ruff", "check", "--fix", "src", "tests"], check=False)
    if result.returncode != 0:
        exit_code = 1
    
    # Ruff formatting
    print("\n🎨 Formatting code...")
    result = run_command(["ruff", "format", "src", "tests"], check=False)
    if result.returncode != 0:
        exit_code = 1
    
    if exit_code == 0:
        print("\n✅ All auto-fixes applied!")
    else:
        print("\n⚠️  Some fixes could not be applied automatically")
    
    return exit_code


def lint_check() -> int:
    """Run linting checks only."""
    print("📋 Running linting checks...")
    result = run_command(["ruff", "check", "src", "tests"], check=False)
    return result.returncode


def lint_fix() -> int:
    """Run linting fixes only."""
    print("🔧 Running linting fixes...")
    result = run_command(["ruff", "check", "--fix", "src", "tests"], check=False)
    return result.returncode


def format_check() -> int:
    """Check code formatting."""
    print("🎨 Checking code formatting...")
    result = run_command(["ruff", "format", "--check", "src", "tests"], check=False)
    return result.returncode


def format_fix() -> int:
    """Fix code formatting."""
    print("🎨 Formatting code...")
    result = run_command(["ruff", "format", "src", "tests"], check=False)
    return result.returncode


def type_check() -> int:
    """Run type checking."""
    print("🔍 Running type checking...")
    result = run_command(["mypy", "src"], check=False)
    return result.returncode


def security_check() -> int:
    """Run security checks."""
    print("🔒 Running security checks...")
    
    exit_code = 0
    
    # Bandit
    result = run_command(["bandit", "-r", "src"], check=False)
    if result.returncode != 0:
        exit_code = 1
    
    # Safety
    result = run_command(["safety", "check"], check=False)
    if result.returncode != 0:
        exit_code = 1
    
    return exit_code


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python quality.py <command>")
        print("Commands:")
        print("  check        - Run all quality checks")
        print("  fix          - Run all auto-fixes")
        print("  lint:check   - Run linting checks")
        print("  lint:fix     - Run linting fixes")
        print("  format:check - Check code formatting")
        print("  format:fix   - Fix code formatting")
        print("  type:check   - Run type checking")
        print("  security     - Run security checks")
        sys.exit(1)
    
    command = sys.argv[1]
    
    commands = {
        "check": check_all,
        "fix": fix_all,
        "lint:check": lint_check,
        "lint:fix": lint_fix,
        "format:check": format_check,
        "format:fix": format_fix,
        "type:check": type_check,
        "security": security_check,
    }
    
    if command not in commands:
        print(f"Unknown command: {command}")
        sys.exit(1)
    
    exit_code = commands[command]()
    sys.exit(exit_code)


if __name__ == "__main__":
    main()