#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for all routes
app.use(cors());

// Serve static files from public directory
app.use(express.static(join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Dashboard',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Proxy endpoints for services to handle CORS
app.get('/api/python/:endpoint(*)', async (req, res) => {
  try {
    const endpoint = req.params.endpoint || '';
    const serviceUrl = process.env.PYTHON_SERVICE_URL || 'http://finance-python-ingestion:8000';
    const url = `${serviceUrl}/${endpoint}`;
    
    const response = await fetch(url);
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.set('Content-Type', contentType || 'text/plain');
      res.send(text);
    }
  } catch (error) {
    console.error('Python service proxy error:', error.message);
    res.status(503).json({ 
      error: 'Service unavailable', 
      message: error.message,
      service: 'python-ingestion'
    });
  }
});

app.get('/api/node/:endpoint(*)', async (req, res) => {
  try {
    const endpoint = req.params.endpoint || '';
    const serviceUrl = process.env.NODE_SERVICE_URL || 'http://finance-node-ingestion:8000';
    const url = `${serviceUrl}/${endpoint}`;
    
    const response = await fetch(url);
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.set('Content-Type', contentType || 'text/plain');
      res.send(text);
    }
  } catch (error) {
    console.error('Node service proxy error:', error.message);
    res.status(503).json({ 
      error: 'Service unavailable', 
      message: error.message,
      service: 'node-ingestion'
    });
  }
});

// Default route serves the dashboard
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎛️  Dashboard Server starting...`);
  console.log(`📊 Dashboard URL: http://localhost:${PORT}`);
  console.log(`🔄 Auto-refresh: Every 30 seconds`);
  console.log(`🛑 Press Ctrl+C to stop`);
});