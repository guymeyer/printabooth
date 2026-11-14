#!/usr/bin/env python3
"""Serve the configurator locally. app/index.html is a body fragment (the published page adds the document shell),
so this wraps it into build/ and serves that folder.   python3 tools/preview.py [port]"""
import http.server, os, shutil, socketserver, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app, build = os.path.join(root, "app"), os.path.join(root, "build")
shutil.rmtree(build, ignore_errors=True); shutil.copytree(app, build)
body = open(os.path.join(app, "index.html"), encoding="utf-8").read()
open(os.path.join(build, "index.html"), "w", encoding="utf-8").write(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    "<style>[hidden]{display:none!important}body{margin:0}</style></head><body>" + body + "</body></html>")
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
os.chdir(build)
handler = http.server.SimpleHTTPRequestHandler
handler.extensions_map[".wasm"] = "application/wasm"
with socketserver.TCPServer(("", port), handler) as httpd:
    print(f"Cassette Booth Builder on http://localhost:{port}/"); httpd.serve_forever()
