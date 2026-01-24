#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[db] init (create tables + lightweight migrations)"
cd "$ROOT_DIR/backend"
python3 ./db_tools.py init


