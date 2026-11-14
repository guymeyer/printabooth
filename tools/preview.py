#!/usr/bin/env python3
"""Serve the configurator locally from a fresh build.   python3 tools/preview.py [port]"""
import http.server, os, socketserver, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import build_site
os.chdir(build_site())
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
handler = http.server.SimpleHTTPRequestHandler
handler.extensions_map[".wasm"] = "application/wasm"
with socketserver.TCPServer(("", port), handler) as httpd:
    print(f"Cassette Booth Builder on http://localhost:{port}/"); httpd.serve_forever()
