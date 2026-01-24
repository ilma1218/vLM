#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

BACKUP_PATH="${1:-}"
if [[ -z "$BACKUP_PATH" ]]; then
  echo "Usage: $0 <backup_db_path>"
  echo "Example: $0 /home/work/vLM/backups/ocr_history-20260124-010203.db"
  exit 2
fi

echo "[db] restore (destructive)"
echo "  - recommended: stop backend before restore"
cd "$ROOT_DIR/backend"
python3 ./db_tools.py restore --from "$BACKUP_PATH" --yes


