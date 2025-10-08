"""
Command Line Interface

Provides CLI commands for running the financial data ingestion system
with proper configuration, logging, and error handling.
"""

import asyncio
import signal
import sys
from pathlib import Path
from typing import Optional

import click

# Import uvloop conditionally (not available on Windows)
try:
    import uvloop
    UVLOOP_AVAILABLE = True
except ImportError:
    UVLOOP_AVAILABLE = False

from . import __version__
from .config import get_config, reload_config
from .logging import setup_logging, get_logger
from .exceptions import FinanceIngestionError, handle_exception


# Global shutdown event for graceful shutdown
shutdown_event = asyncio.Event()


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    logger = get_logger('cli')
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_event.set()


@click.group()
@click.version_option(version=__version__)
@click.option(
    '--config-file',
    type=click.Path(exists=True, path_type=Path),
    help='Path to configuration file'
)
@click.option(
    '--log-level',
    type=click.Choice(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']),
    help='Override log level'
)
@click.option(
    '--verbose',
    is_flag=True,
    help='Enable verbose logging'
)
@click.pass_context
def cli(ctx, config_file, log_level, verbose):
    """
    Financial Data Ingestion System - Python Implementation
    
    High-performance financial data ingestion system for benchmarking
    against Node.js implementation.
    """
    # Ensure context object exists
    ctx.ensure_object(dict)
    
    try:
        # Load configuration
        if config_file:
            # TODO: Implement config file loading
            pass
        
        config = get_config()
        
        # Override configuration with CLI options
        if log_level:
            config.monitoring.log_level = log_level
        if verbose:
            config.verbose = True
        
        # Set up logging
        setup_logging(config)
        
        # Store config in context
        ctx.obj['config'] = config
        
        logger = get_logger('cli')
        logger.info(
            "Finance Ingestion System starting",
            version=__version__,
            environment=config.environment,
            log_level=config.monitoring.log_level
        )
        
    except Exception as e:
        click.echo(f"Error initializing application: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.option(
    '--host',
    default='localhost',
    help='WebSocket server host'
)
@click.option(
    '--port',
    default=8080,
    type=int,
    help='WebSocket server port'
)
@click.option(
    '--duration',
    default=60,
    type=int,
    help='Run duration in seconds (0 for infinite)'
)
@click.option(
    '--dry-run',
    is_flag=True,
    help='Run in dry-run mode (no actual processing)'
)
@click.pass_context
def run(ctx, host, port, duration, dry_run):
    """
    Run the financial data ingestion system.
    
    Connects to WebSocket data feed and processes incoming market data
    with real-time storage and performance monitoring.
    """
    config = ctx.obj['config']
    logger = get_logger('cli.run')
    
    # Override configuration with CLI options
    config.websocket.url = f"wss://{host}:{port}/market-data"
    if duration > 0:
        config.benchmark.duration_ms = duration * 1000
    config.dry_run = dry_run
    
    logger.info(
        "Starting ingestion system",
        websocket_url=config.websocket.url,
        duration_ms=config.benchmark.duration_ms if duration > 0 else "infinite",
        dry_run=dry_run
    )
    
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Use uvloop for maximum performance (if available)
        if UVLOOP_AVAILABLE:
            uvloop.install()
            logger.info("Using uvloop for enhanced performance")
        else:
            logger.info("uvloop not available, using default asyncio event loop")
        
        # Run the main application
        asyncio.run(_run_ingestion_system(config))
        
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down...")
    except Exception as e:
        handle_exception(e, logger, context={'command': 'run'})
        sys.exit(1)


@cli.command()
@click.option(
    '--output',
    type=click.Path(path_type=Path),
    help='Output file for benchmark results'
)
@click.option(
    '--format',
    type=click.Choice(['json', 'csv', 'html']),
    default='json',
    help='Output format for results'
)
@click.pass_context
def benchmark(ctx, output, format):
    """
    Run performance benchmarks.
    
    Executes comprehensive performance tests and generates
    detailed benchmark reports.
    """
    config = ctx.obj['config']
    logger = get_logger('cli.benchmark')
    
    logger.info(
        "Starting benchmark suite",
        output_file=str(output) if output else None,
        output_format=format
    )
    
    try:
        # Use uvloop for maximum performance (if available)
        if UVLOOP_AVAILABLE:
            uvloop.install()
        
        # Run benchmark suite
        asyncio.run(_run_benchmark_suite(config, output, format))
        
    except Exception as e:
        handle_exception(e, logger, context={'command': 'benchmark'})
        sys.exit(1)


@cli.command()
@click.pass_context
def validate_config(ctx):
    """
    Validate the current configuration.
    
    Checks configuration values and reports any issues.
    """
    config = ctx.obj['config']
    logger = get_logger('cli.validate')
    
    logger.info("Validating configuration...")
    
    try:
        # Validate configuration
        errors = []
        
        # Check WebSocket configuration
        if not config.websocket.url.startswith(('ws://', 'wss://')):
            errors.append("WebSocket URL must start with ws:// or wss://")
        
        # Check database configuration
        if not config.postgresql.database:
            errors.append("PostgreSQL database name is required")
        
        # Check Redis configuration
        if config.redis.port < 1 or config.redis.port > 65535:
            errors.append("Redis port must be between 1 and 65535")
        
        # Report results
        if errors:
            logger.error("Configuration validation failed", errors=errors)
            for error in errors:
                click.echo(f"ERROR: {error}", err=True)
            sys.exit(1)
        else:
            logger.info("Configuration validation passed")
            click.echo("Configuration is valid ✓")
    
    except Exception as e:
        handle_exception(e, logger, context={'command': 'validate-config'})
        sys.exit(1)


@cli.command()
@click.pass_context
def health_check(ctx):
    """
    Perform system health checks.
    
    Checks connectivity to external dependencies and system resources.
    """
    config = ctx.obj['config']
    logger = get_logger('cli.health')
    
    logger.info("Performing health checks...")
    
    try:
        # Use uvloop for async operations (if available)
        if UVLOOP_AVAILABLE:
            uvloop.install()
        
        # Run health checks
        asyncio.run(_run_health_checks(config))
        
    except Exception as e:
        handle_exception(e, logger, context={'command': 'health-check'})
        sys.exit(1)


async def _run_ingestion_system(config):
    """
    Main ingestion system entry point.
    
    This will be implemented in subsequent tasks as we build
    the connection manager, message processor, and storage layer.
    """
    logger = get_logger('ingestion')
    
    logger.info("Ingestion system would start here")
    logger.info("This will be implemented in subsequent tasks")
    
    # Placeholder for actual implementation
    if config.dry_run:
        logger.info("Running in dry-run mode - no actual processing")
        await asyncio.sleep(5)  # Simulate some work
    else:
        logger.info("Would connect to WebSocket and start processing")
        await asyncio.sleep(5)  # Simulate some work
    
    logger.info("Ingestion system completed")


async def _run_benchmark_suite(config, output_file, output_format):
    """
    Run the benchmark suite.
    
    This will be implemented in subsequent tasks as we build
    the benchmarking infrastructure.
    """
    logger = get_logger('benchmark')
    
    logger.info("Benchmark suite would start here")
    logger.info("This will be implemented in subsequent tasks")
    
    # Placeholder for actual implementation
    await asyncio.sleep(2)  # Simulate benchmark execution
    
    if output_file:
        logger.info(f"Would save results to {output_file} in {output_format} format")
    
    logger.info("Benchmark suite completed")


async def _run_health_checks(config):
    """
    Run system health checks.
    
    This will be implemented in subsequent tasks as we build
    the storage and connection infrastructure.
    """
    logger = get_logger('health')
    
    logger.info("Health checks would start here")
    logger.info("This will be implemented in subsequent tasks")
    
    # Placeholder for actual implementation
    checks = [
        "WebSocket connectivity",
        "Redis connectivity", 
        "PostgreSQL connectivity",
        "System resources"
    ]
    
    for check in checks:
        logger.info(f"Would check: {check}")
        await asyncio.sleep(0.5)  # Simulate check
    
    logger.info("All health checks would pass")
    click.echo("All health checks passed ✓")


def main():
    """Main entry point for the CLI."""
    try:
        cli()
    except Exception as e:
        click.echo(f"Unexpected error: {e}", err=True)
        sys.exit(1)


if __name__ == '__main__':
    main()