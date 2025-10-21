"""
Command-line interface for the Finance Ingestion application.

This module provides CLI commands for configuration validation, health checks,
and other operational tasks.
"""

import json
import sys

import click
from rich.console import Console
from rich.table import Table

from .config import get_config, validate_config

console = Console()


@click.group()
@click.version_option()
def cli():
    """Finance Ingestion CLI - Configuration and operational tools."""


@cli.command()
@click.option(
    '--env',
    type=click.Choice(['development', 'staging', 'production']),
    help='Target environment to validate'
)
@click.option(
    '--json-output',
    is_flag=True,
    help='Output results in JSON format'
)
@click.option(
    '--verbose',
    is_flag=True,
    help='Show detailed configuration values'
)
def validate_config_cmd(env: str | None, json_output: bool, verbose: bool):
    """Validate configuration for the specified environment."""

    try:
        is_valid, errors, warnings = validate_config(env)

        if json_output:
            # JSON output for programmatic use
            result = {
                'valid': is_valid,
                'environment': env or 'current',
                'errors': errors,
                'warnings': warnings
            }

            if verbose:
                try:
                    config = get_config()
                    # Mask sensitive values
                    config_dict = _mask_sensitive_config(config.dict())
                    result['configuration'] = config_dict
                except Exception as e:
                    result['configuration_error'] = str(e)

            click.echo(json.dumps(result, indent=2))
            sys.exit(0 if is_valid else 1)

        # Rich console output for human use
        _display_validation_results(is_valid, errors, warnings, env, verbose)
        sys.exit(0 if is_valid else 1)

    except Exception as e:
        if json_output:
            click.echo(json.dumps({
                'valid': False,
                'environment': env or 'current',
                'errors': [f'Validation failed: {e!s}'],
                'warnings': []
            }, indent=2))
        else:
            console.print(f"[red]❌ Configuration validation failed: {e!s}[/red]")
        sys.exit(1)


@cli.command()
@click.option(
    '--format',
    type=click.Choice(['table', 'json']),
    default='table',
    help='Output format'
)
def show_config(format: str):
    """Display current configuration."""

    try:
        config = get_config()

        if format == 'json':
            config_dict = _mask_sensitive_config(config.dict())
            click.echo(json.dumps(config_dict, indent=2))
        else:
            _display_config_table(config)

    except Exception as e:
        console.print(f"[red]❌ Failed to load configuration: {e!s}[/red]")
        sys.exit(1)


@cli.command()
def health_check():
    """Perform application health check."""

    try:
        config = get_config()

        # Basic configuration validation
        is_valid, errors, warnings = validate_config()

        if not is_valid:
            console.print("[red]❌ Health check failed - configuration errors[/red]")
            for error in errors:
                console.print(f"  • {error}")
            sys.exit(1)

        # TODO: Add database connectivity check
        # TODO: Add Redis connectivity check
        # TODO: Add external service checks

        console.print("[green]✅ Health check passed[/green]")

        if warnings:
            console.print("\n[yellow]⚠️  Warnings:[/yellow]")
            for warning in warnings:
                console.print(f"  • {warning}")

    except Exception as e:
        console.print(f"[red]❌ Health check failed: {e!s}[/red]")
        sys.exit(1)


def _display_validation_results(is_valid: bool, errors: list, warnings: list, env: str | None, verbose: bool):
    """Display validation results using rich console formatting."""

    # Header
    env_text = env or "current environment"
    if is_valid:
        console.print(f"[green]✅ Configuration Valid[/green] for {env_text}")
    else:
        console.print(f"[red]❌ Configuration Invalid[/red] for {env_text}")

    # Configuration summary
    if verbose:
        try:
            config = get_config()
            _display_config_summary(config)
        except Exception as e:
            console.print(f"[yellow]⚠️  Could not load configuration details: {e!s}[/yellow]")

    # Errors
    if errors:
        console.print("\n[red]❌ Errors:[/red]")
        for error in errors:
            console.print(f"  • {error}")

    # Warnings
    if warnings:
        console.print("\n[yellow]⚠️  Warnings:[/yellow]")
        for warning in warnings:
            console.print(f"  • {warning}")

    # Suggestions
    if errors or warnings:
        console.print("\n[blue]💡 Suggestions:[/blue]")

        if any("password" in str(item).lower() for item in errors + warnings):
            console.print("  • Set secure passwords using environment variables")
            console.print("  • Use different passwords for each environment")

        if any("ssl" in str(item).lower() for item in warnings):
            console.print("  • Enable SSL/TLS for production deployments")
            console.print("  • Configure SSL certificates and keys")

        if any("cors" in str(item).lower() for item in errors):
            console.print("  • Set specific CORS origins for production")
            console.print("  • Use environment-specific CORS configuration")

        if any("environment variable" in str(item) for item in errors):
            console.print("  • Set required environment variables for your target environment")
            console.print("  • Check your deployment configuration")


def _display_config_summary(config):
    """Display a summary of the loaded configuration."""

    table = Table(title="📋 Configuration Summary", show_header=True, header_style="bold magenta")
    table.add_column("Setting", style="cyan", no_wrap=True)
    table.add_column("Value", style="green")

    # Application settings
    table.add_row("Environment", config.environment)
    table.add_row("Application Port", str(config.port))
    table.add_row("Log Level", config.log_level)
    table.add_row("Metrics Enabled", "✅" if config.enable_metrics else "❌")

    # Database settings
    table.add_row("Database Host", f"{config.database.host}:{config.database.port}")
    table.add_row("Database Name", config.database.name)
    table.add_row("Database SSL", "✅" if config.database.ssl else "❌")

    # Redis settings
    table.add_row("Redis Host", f"{config.redis.host}:{config.redis.port}")
    table.add_row("Redis Database", str(config.redis.db))

    # WebSocket settings
    if config.websocket.enabled:
        table.add_row("WebSocket Port", str(config.websocket.port))
        table.add_row("WebSocket Max Connections", str(config.websocket.max_connections))
    else:
        table.add_row("WebSocket", "❌ Disabled")

    # Security settings
    table.add_row("CORS Enabled", "✅" if config.security.cors_enabled else "❌")
    table.add_row("Rate Limiting", "✅" if config.security.rate_limit_enabled else "❌")
    table.add_row("SSL Enabled", "✅" if config.security.ssl_enabled else "❌")

    console.print(table)

    # Default value warnings
    default_warnings = []

    if config.database.password.get_secret_value() in ["postgres", "password", "admin"]:
        default_warnings.append("Using default database password")

    if config.redis.password and config.redis.password.get_secret_value() in ["redis", "password"]:
        default_warnings.append("Using default Redis password")

    if config.security.cors_origin == "*" and config.environment == "production":
        default_warnings.append("CORS origin set to '*' in production")

    if default_warnings:
        console.print("\n[yellow]⚠️  Default Values Detected:[/yellow]")
        for warning in default_warnings:
            console.print(f"  • {warning}")


def _display_config_table(config):
    """Display full configuration in table format."""

    # Application Configuration
    app_table = Table(title="Application Configuration", show_header=True, header_style="bold blue")
    app_table.add_column("Setting", style="cyan")
    app_table.add_column("Value", style="white")

    app_table.add_row("Port", str(config.port))
    app_table.add_row("Host", config.host)
    app_table.add_row("Environment", config.environment)
    app_table.add_row("Log Level", config.log_level)
    app_table.add_row("Log Format", config.log_format)
    app_table.add_row("Metrics Enabled", str(config.enable_metrics))
    app_table.add_row("Clustering Enabled", str(config.enable_clustering))
    app_table.add_row("Cluster Workers", str(config.cluster_workers))

    console.print(app_table)

    # Database Configuration
    db_table = Table(title="Database Configuration", show_header=True, header_style="bold green")
    db_table.add_column("Setting", style="cyan")
    db_table.add_column("Value", style="white")

    db_table.add_row("Host", config.database.host)
    db_table.add_row("Port", str(config.database.port))
    db_table.add_row("Database", config.database.name)
    db_table.add_row("Username", config.database.username)
    db_table.add_row("Password", "***" if config.database.password else "Not set")
    db_table.add_row("SSL", str(config.database.ssl))
    db_table.add_row("Pool Min", str(config.database.pool_min))
    db_table.add_row("Pool Max", str(config.database.pool_max))

    console.print(db_table)

    # Redis Configuration
    redis_table = Table(title="Redis Configuration", show_header=True, header_style="bold red")
    redis_table.add_column("Setting", style="cyan")
    redis_table.add_column("Value", style="white")

    redis_table.add_row("Host", config.redis.host)
    redis_table.add_row("Port", str(config.redis.port))
    redis_table.add_row("Database", str(config.redis.db))
    redis_table.add_row("Password", "***" if config.redis.password else "Not set")
    redis_table.add_row("Connect Timeout", f"{config.redis.connect_timeout}ms")
    redis_table.add_row("Command Timeout", f"{config.redis.command_timeout}ms")

    console.print(redis_table)


def _mask_sensitive_config(config_dict: dict) -> dict:
    """Mask sensitive configuration values for safe display."""

    sensitive_keys = ['password', 'secret', 'key', 'token', 'credential']

    def mask_recursive(obj):
        if isinstance(obj, dict):
            return {
                key: "***" if any(sensitive in key.lower() for sensitive in sensitive_keys)
                     else mask_recursive(value)
                for key, value in obj.items()
            }
        if isinstance(obj, list):
            return [mask_recursive(item) for item in obj]
        return obj

    return mask_recursive(config_dict)


def main():
    """Main entry point for the CLI."""
    cli()


if __name__ == '__main__':
    main()
