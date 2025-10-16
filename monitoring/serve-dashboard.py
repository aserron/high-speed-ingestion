#!/usr/bin/env python3
"""
Simple HTTP server to serve the unified dashboard
Usage: python serve-dashboard.py
Access: http://localhost:8080
"""

import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

PORT = 8080
DIRECTORY = Path(__file__).parent

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def serve_dashboard():
    os.chdir(DIRECTORY)
    
    with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
        print(f"🎛️  Unified Dashboard Server starting...")
        print(f"📊 Dashboard URL: http://localhost:{PORT}/unified-dashboard.html")
        print(f"🔄 Auto-refresh: Every 30 seconds")
        print(f"🛑 Press Ctrl+C to stop")
        
        # Try to open browser automatically
        try:
            webbrowser.open(f'http://localhost:{PORT}/unified-dashboard.html')
        except:
            pass
            
        httpd.serve_forever()

if __name__ == "__main__":
    serve_dashboard()