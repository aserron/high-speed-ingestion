"""
FastAPI Application Entry Point for Uvicorn

This module provides the FastAPI app instance that uvicorn can import directly.
"""

from fastapi import FastAPI

# Create a minimal working FastAPI app
app = FastAPI(
    title="Finance Ingestion API",
    description="High-performance financial market data ingestion system",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {
        "service": "finance-ingestion-python",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "finance-ingestion-python",
        "version": "1.0.0"
    }

@app.get("/metrics")
async def metrics():
    return {
        "messages_processed": 0,
        "uptime_seconds": 0,
        "status": "ok"
    }