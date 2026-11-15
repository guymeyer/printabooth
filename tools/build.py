#!/usr/bin/env python3
# Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
"""Build the static site into build/. app/index.html is a body fragment (the claude.ai artifact host adds the document
shell), so the build wraps it in a full page; everything else is copied as is. Used by Netlify and tools/preview.py."""
import os, shutil
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app, build = os.path.join(root, "app"), os.path.join(root, "build")

def build_site():
    shutil.rmtree(build, ignore_errors=True)
    shutil.copytree(app, build)
    body = open(os.path.join(app, "index.html"), encoding="utf-8").read()
    with open(os.path.join(build, "index.html"), "w", encoding="utf-8") as f:
        f.write('<!doctype html><html lang="en"><head><meta charset="utf-8">'
                '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
                '<title>Cassette Booth Builder</title>'
                '<meta name="description" content="Configure a 3D-printed modular iPad photo booth and export print-ready parts.">'
                "<style>[hidden]{display:none!important}body{margin:0}</style></head><body>" + body + "</body></html>")
    return build

if __name__ == "__main__":
    print("built", build_site())
