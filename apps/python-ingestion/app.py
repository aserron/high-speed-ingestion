"""
FastAPI Application Entry Point

This module provides the FastAPI app instance for uvicorn to serve.
It initializes the application with proper configuration and error handling.
"""

import asyncio
import os
from typing import Dict, Any

from src.finance_ingestion.api import get_api_server
from src.finance_ingestion.config import get_config
from src.finance_ingestion.logging import setup_logging, get_logger

# Initialize configuration
config = get_config()

# Setup logging
setup_logging(config)
logger = get_logger('app')

# Create API server instance
api_server = get_api_server(config)

# Export the FastAPI app for uvicorn
app = api_server.app

# Log startup information
logger.info("FastAPI application initialized", 
           version="1.0.0",
           environment=config.environment)

# Add startup event handler
@app.on_event("startup")
async def startup_event():
    """Application startup event handler"""
    logger.info("Application startup event triggered")
    
    # Initialize storage manager if needed
    try:
        from src.finance_ingestion.storage.storage_manager import StorageManager
        storage_manager = StorageManager(config)
        await storage_manager.initialize()
        api_server.set_storage_manager(storage_manager)
        logger.info("Storage manager initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize storage manager", error=str(e))
        # Continue without storage manager for basic API functionality

@app.on_event("shutdown") 
async def shutdown_event():
    """Application shutdown event handler"""
    logger.info("Application shutdown event triggered")
    
    # Cleanup storage manager
    if api_server.storage_manager:
        try:
            await api_server.storage_manager.cleanup()
            logger.info("Storage manager cleanup completed")
        except Exception as e:
            logger.error("Error during storage manager cleanup", error=str(e))

# Health check endpoint for container health checks
@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Finance Ingestion API", "status": "running", "version": "1.0.0"}

if __name__ == "__main__":
    # This allows running the app directly with python app.py
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting application directly on {host}:{port}")
    uvicorn.run(app, host=host, port=port)