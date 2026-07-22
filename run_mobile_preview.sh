#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
python3 -m http.server 8080 --bind 0.0.0.0
