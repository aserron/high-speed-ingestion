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