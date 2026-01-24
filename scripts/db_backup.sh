#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

OUT_PATH="${1:-}"

echo "[db] backup"
cd "$ROOT_DIR/backend"
if [[ -n "$OUT_PATH" ]]; then
  python3 ./db_tools.py backup --out "$OUT_PATH"
else
  python3 ./db_tools.py backup
fi


