"""
Production Configuration

Production-specific configuration settings for the Python financial data ingestion system.
Includes security, authentication, TLS/SSL, and production monitoring settings.
"""

import os
import ssl
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

from ..src.finance_ingestion.config import AppConfig, WebSocketConfig, MonitoringConfig


@dataclass
class AuthenticationConfig:
    """Authentication configuration for production"""
    
    # API Key authentication
    api_key_enabled: bool = True
    api_key_header: str = "X-API-Key"
    api_keys: List[str] = field(default_factory=list)
    
    # JWT authentication
    jwt_enabled: bool = False
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    jwt_issuer: str = "finance-ingestion-system"
    
    # Basic authentication (for admin endpoints)
    basic_auth_enabled: bool = True
    admin_username: str = "admin"
    admin_password_hash: str = ""  # bcrypt hash
    
    # Rate limiting
    rate_limit_enabled: bool = True
    rate_limit_requests_per_minute: int = 1000
    rate_limit_burst_size: int = 100
    
    @classmethod
    def from_environment(cls) -> 'AuthenticationConfig':
        """Load authentication config from environment variables"""
        config = cls()
        
        # API Keys
        if os.getenv('AUTH_API_KEY_ENABLED'):
            config.api_key_enabled = os.getenv('AUTH_API_KEY_ENABLED').lower() == 'true'
        
        if os.getenv('AUTH_API_KEYS'):
            config.api_keys = os.getenv('AUTH_API_KEYS').split(',')
        
        # JWT
        if os.getenv('AUTH_JWT_ENABLED'):
            config.jwt_enabled = os.getenv('AUTH_JWT_ENABLED').lower() == 'true'
        
        if os.getenv('AUTH_JWT_SECRET_KEY'):
            config.jwt_secret_key = os.getenv('AUTH_JWT_SECRET_KEY')
        
        if os.getenv('AUTH_JWT_ALGORITHM'):
            config.jwt_algorithm = os.getenv('AUTH_JWT_ALGORITHM')
        
        # Basic Auth
        if os.getenv('AUTH_BASIC_ENABLED'):
            config.basic_auth_enabled = os.getenv('AUTH_BASIC_ENABLED').lower() == 'true'
        
        if os.getenv('AUTH_ADMIN_USERNAME'):
            config.admin_username = os.getenv('AUTH_ADMIN_USERNAME')
        
        if os.getenv('AUTH_ADMIN_PASSWORD_HASH'):
            config.admin_password_hash = os.getenv('AUTH_ADMIN_PASSWORD_HASH')
        
        # Rate Limiting
        if os.getenv('AUTH_RATE_LIMIT_ENABLED'):
            config.rate_limit_enabled = os.getenv('AUTH_RATE_LIMIT_ENABLED').lower() == 'true'
        
        if os.getenv('AUTH_RATE_LIMIT_RPM'):
            config.rate_limit_requests_per_minute = int(os.getenv('AUTH_RATE_LIMIT_RPM'))
        
        return config


@dataclass
class TLSConfig:
    """TLS/SSL configuration for production"""
    
    # TLS settings
    tls_enabled: bool = True
    tls_cert_file: str = "/etc/ssl/certs/app.crt"
    tls_key_file: str = "/etc/ssl/private/app.key"
    tls_ca_file: Optional[str] = None
    
    # SSL context settings
    ssl_protocol: str = "TLSv1_2"  # TLSv1_2, TLSv1_3
    ssl_ciphers: str = "ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS"
    ssl_verify_mode: str = "CERT_REQUIRED"  # CERT_NONE, CERT_OPTIONAL, CERT_REQUIRED
    
    # WebSocket TLS
    websocket_tls_enabled: bool = True
    websocket_verify_ssl: bool = True
    websocket_ssl_cert_reqs: str = "CERT_REQUIRED"
    
    # Client certificate authentication
    client_cert_auth_enabled: bool = False
    client_cert_ca_file: Optional[str] = None
    
    @classmethod
    def from_environment(cls) -> 'TLSConfig':
        """Load TLS config from environment variables"""
        config = cls()
        
        if os.getenv('TLS_ENABLED'):
            config.tls_enabled = os.getenv('TLS_ENABLED').lower() == 'true'
        
        if os.getenv('TLS_CERT_FILE'):
            config.tls_cert_file = os.getenv('TLS_CERT_FILE')
        
        if os.getenv('TLS_KEY_FILE'):
            config.tls_key_file = os.getenv('TLS_KEY_FILE')
        
        if os.getenv('TLS_CA_FILE'):
            config.tls_ca_file = os.getenv('TLS_CA_FILE')
        
        if os.getenv('SSL_PROTOCOL'):
            config.ssl_protocol = os.getenv('SSL_PROTOCOL')
        
        if os.getenv('WEBSOCKET_TLS_ENABLED'):
            config.websocket_tls_enabled = os.getenv('WEBSOCKET_TLS_ENABLED').lower() == 'true'
        
        if os.getenv('WEBSOCKET_VERIFY_SSL'):
            config.websocket_verify_ssl = os.getenv('WEBSOCKET_VERIFY_SSL').lower() == 'true'
        
        return config
    
    def create_ssl_context(self) -> ssl.SSLContext:
        """Create SSL context for production use"""
        if not self.tls_enabled:
            return None
        
        # Create SSL context
        if self.ssl_protocol == "TLSv1_3":
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.minimum_version = ssl.TLSVersion.TLSv1_3
        else:
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.minimum_version = ssl.TLSVersion.TLSv1_2
        
        # Load certificate and key
        if os.path.exists(self.tls_cert_file) and os.path.exists(self.tls_key_file):
            context.load_cert_chain(self.tls_cert_file, self.tls_key_file)
        
        # Set cipher suites
        context.set_ciphers(self.ssl_ciphers)
        
        # Configure verification
        if self.ssl_verify_mode == "CERT_REQUIRED":
            context.verify_mode = ssl.CERT_REQUIRED
        elif self.ssl_verify_mode == "CERT_OPTIONAL":
            context.verify_mode = ssl.CERT_OPTIONAL
        else:
            context.verify_mode = ssl.CERT_NONE
        
        # Load CA certificates if specified
        if self.tls_ca_file and os.path.exists(self.tls_ca_file):
            context.load_verify_locations(self.tls_ca_file)
        
        # Client certificate authentication
        if self.client_cert_auth_enabled and self.client_cert_ca_file:
            context.verify_mode = ssl.CERT_REQUIRED
            context.load_verify_locations(self.client_cert_ca_file)
        
        return context


@dataclass
class ProductionLoggingConfig:
    """Production logging configuration"""
    
    # Log levels and formats
    log_level: str = "INFO"
    log_format: str = "json"
    log_timestamps: bool = True
    log_correlation_ids: bool = True
    
    # Log destinations
    log_to_console: bool = True
    log_to_file: bool = True
    log_to_syslog: bool = False
    log_to_elasticsearch: bool = False
    
    # File logging
    log_file_path: str = "/var/log/finance-ingestion/app.log"
    log_file_max_size_mb: int = 100
    log_file_backup_count: int = 10
    log_file_rotation: str = "size"  # size, time
    
    # Syslog configuration
    syslog_host: str = "localhost"
    syslog_port: int = 514
    syslog_facility: str = "local0"
    
    # Elasticsearch logging
    elasticsearch_host: str = "localhost"
    elasticsearch_port: int = 9200
    elasticsearch_index: str = "finance-ingestion-logs"
    
    # Security and privacy
    log_sensitive_data: bool = False
    mask_pii: bool = True
    log_request_bodies: bool = False
    
    @classmethod
    def from_environment(cls) -> 'ProductionLoggingConfig':
        """Load logging config from environment variables"""
        config = cls()
        
        if os.getenv('LOG_LEVEL'):
            config.log_level = os.getenv('LOG_LEVEL')
        
        if os.getenv('LOG_FORMAT'):
            config.log_format = os.getenv('LOG_FORMAT')
        
        if os.getenv('LOG_TO_FILE'):
            config.log_to_file = os.getenv('LOG_TO_FILE').lower() == 'true'
        
        if os.getenv('LOG_FILE_PATH'):
            config.log_file_path = os.getenv('LOG_FILE_PATH')
        
        if os.getenv('LOG_TO_SYSLOG'):
            config.log_to_syslog = os.getenv('LOG_TO_SYSLOG').lower() == 'true'
        
        if os.getenv('LOG_TO_ELASTICSEARCH'):
            config.log_to_elasticsearch = os.getenv('LOG_TO_ELASTICSEARCH').lower() == 'true'
        
        if os.getenv('ELASTICSEARCH_HOST'):
            config.elasticsearch_host = os.getenv('ELASTICSEARCH_HOST')
        
        return config


@dataclass
class ProductionMonitoringConfig:
    """Production monitoring configuration"""
    
    # Metrics collection
    metrics_enabled: bool = True
    metrics_port: int = 9090
    metrics_path: str = "/metrics"
    metrics_interval_seconds: int = 15
    
    # Health checks
    health_check_enabled: bool = True
    health_check_port: int = 8080
    health_check_path: str = "/health"
    health_check_timeout_seconds: int = 30
    
    # Alerting
    alerting_enabled: bool = True
    alert_webhook_url: Optional[str] = None
    alert_email_enabled: bool = False
    alert_email_smtp_host: str = "localhost"
    alert_email_smtp_port: int = 587
    alert_email_from: str = "alerts@finance-ingestion.com"
    alert_email_to: List[str] = field(default_factory=list)
    
    # Performance thresholds for alerting
    alert_cpu_threshold_percent: float = 80.0
    alert_memory_threshold_percent: float = 85.0
    alert_latency_threshold_ms: float = 100.0
    alert_error_rate_threshold_percent: float = 5.0
    
    # Distributed tracing
    tracing_enabled: bool = False
    tracing_service_name: str = "finance-ingestion-python"
    tracing_jaeger_host: str = "localhost"
    tracing_jaeger_port: int = 14268
    
    @classmethod
    def from_environment(cls) -> 'ProductionMonitoringConfig':
        """Load monitoring config from environment variables"""
        config = cls()
        
        if os.getenv('METRICS_ENABLED'):
            config.metrics_enabled = os.getenv('METRICS_ENABLED').lower() == 'true'
        
        if os.getenv('METRICS_PORT'):
            config.metrics_port = int(os.getenv('METRICS_PORT'))
        
        if os.getenv('HEALTH_CHECK_PORT'):
            config.health_check_port = int(os.getenv('HEALTH_CHECK_PORT'))
        
        if os.getenv('ALERTING_ENABLED'):
            config.alerting_enabled = os.getenv('ALERTING_ENABLED').lower() == 'true'
        
        if os.getenv('ALERT_WEBHOOK_URL'):
            config.alert_webhook_url = os.getenv('ALERT_WEBHOOK_URL')
        
        if os.getenv('TRACING_ENABLED'):
            config.tracing_enabled = os.getenv('TRACING_ENABLED').lower() == 'true'
        
        return config


class ProductionConfigManager:
    """Production configuration manager"""
    
    def __init__(self):
        self.auth_config = AuthenticationConfig.from_environment()
        self.tls_config = TLSConfig.from_environment()
        self.logging_config = ProductionLoggingConfig.from_environment()
        self.monitoring_config = ProductionMonitoringConfig.from_environment()
    
    def get_production_app_config(self) -> AppConfig:
        """Get production application configuration"""
        # Load base configuration
        base_config = AppConfig()
        
        # Override with production settings
        base_config.environment = "production"
        base_config.debug = False
        base_config.verbose = False
        
        # Update WebSocket configuration for production
        base_config.websocket.tls_enabled = self.tls_config.websocket_tls_enabled
        base_config.websocket.tls_verify_certificate = self.tls_config.websocket_verify_ssl
        
        # Update monitoring configuration
        base_config.monitoring.prometheus_enabled = self.monitoring_config.metrics_enabled
        base_config.monitoring.prometheus_port = self.monitoring_config.metrics_port
        base_config.monitoring.health_check_enabled = self.monitoring_config.health_check_enabled
        base_config.monitoring.health_check_port = self.monitoring_config.health_check_port
        
        # Update logging configuration
        base_config.monitoring.log_level = self.logging_config.log_level
        base_config.monitoring.log_format = self.logging_config.log_format
        base_config.monitoring.log_timestamps = self.logging_config.log_timestamps
        
        return base_config
    
    def validate_production_config(self) -> List[str]:
        """Validate production configuration and return list of issues"""
        issues = []
        
        # Validate authentication
        if self.auth_config.api_key_enabled and not self.auth_config.api_keys:
            issues.append("API key authentication enabled but no API keys configured")
        
        if self.auth_config.jwt_enabled and not self.auth_config.jwt_secret_key:
            issues.append("JWT authentication enabled but no secret key configured")
        
        # Validate TLS
        if self.tls_config.tls_enabled:
            if not os.path.exists(self.tls_config.tls_cert_file):
                issues.append(f"TLS certificate file not found: {self.tls_config.tls_cert_file}")
            
            if not os.path.exists(self.tls_config.tls_key_file):
                issues.append(f"TLS key file not found: {self.tls_config.tls_key_file}")
        
        # Validate logging
        if self.logging_config.log_to_file:
            log_dir = Path(self.logging_config.log_file_path).parent
            if not log_dir.exists():
                issues.append(f"Log directory does not exist: {log_dir}")
        
        # Validate monitoring
        if self.monitoring_config.alerting_enabled:
            if not self.monitoring_config.alert_webhook_url and not self.monitoring_config.alert_email_enabled:
                issues.append("Alerting enabled but no webhook URL or email configuration provided")
        
        return issues
    
    def generate_environment_template(self) -> str:
        """Generate environment variable template for production deployment"""
        template = """
# Production Environment Configuration Template
# Copy this file to .env and configure the values for your environment

# Application Environment
ENVIRONMENT=production
DEBUG=false
VERBOSE=false

# Authentication Configuration
AUTH_API_KEY_ENABLED=true
AUTH_API_KEYS=your-api-key-1,your-api-key-2
AUTH_JWT_ENABLED=false
AUTH_JWT_SECRET_KEY=your-jwt-secret-key-here
AUTH_BASIC_ENABLED=true
AUTH_ADMIN_USERNAME=admin
AUTH_ADMIN_PASSWORD_HASH=your-bcrypt-hash-here

# TLS/SSL Configuration
TLS_ENABLED=true
TLS_CERT_FILE=/etc/ssl/certs/app.crt
TLS_KEY_FILE=/etc/ssl/private/app.key
TLS_CA_FILE=/etc/ssl/certs/ca.crt
SSL_PROTOCOL=TLSv1_2
WEBSOCKET_TLS_ENABLED=true
WEBSOCKET_VERIFY_SSL=true

# Database Configuration
POSTGRESQL_HOST=postgres.example.com
POSTGRESQL_PORT=5432
POSTGRESQL_DATABASE=finance_ingestion_prod
POSTGRESQL_USERNAME=finance_user
POSTGRESQL_PASSWORD=secure-password-here
POSTGRESQL_SSL_ENABLED=true

REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=redis-password-here
REDIS_DB=0

# WebSocket Configuration
WEBSOCKET_URL=wss://market-data.example.com/feed

# Logging Configuration
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_TO_FILE=true
LOG_FILE_PATH=/var/log/finance-ingestion/app.log
LOG_TO_SYSLOG=false
LOG_TO_ELASTICSEARCH=false

# Monitoring Configuration
METRICS_ENABLED=true
METRICS_PORT=9090
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PORT=8080
ALERTING_ENABLED=true
ALERT_WEBHOOK_URL=https://hooks.slack.com/your-webhook-url

# Performance Tuning
PROCESSING_BATCH_SIZE=1000
PROCESSING_MAX_QUEUE_SIZE=100000
POSTGRESQL_MAX_CONNECTIONS=50
REDIS_MAX_CONNECTIONS=20
"""
        return template.strip()


def get_production_config() -> ProductionConfigManager:
    """Get production configuration manager instance"""
    return ProductionConfigManager()


if __name__ == "__main__":
    # Validate production configuration
    config_manager = get_production_config()
    issues = config_manager.validate_production_config()
    
    if issues:
        print("Production configuration issues found:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("Production configuration validation passed")
    
    # Generate environment template
    template = config_manager.generate_environment_template()
    print("\nEnvironment template:")
    print(template)