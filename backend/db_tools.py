#!/usr/bin/env python3
"""
SQLite DB utilities for vLM.

- init: create tables + apply lightweight schema migrations (via database.init_db)
- backup: create a consistent backup even while the server is running (uses sqlite3 backup API)
- restore: restore DB from a backup file (recommended with backend stopped)

DB file default: backend/ocr_history.db
"""

from __future__ import annotations

import argparse
import shutil
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path


def _default_db_path() -> Path:
    return Path(__file__).parent / "ocr_history.db"


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def init_db_cmd(db_path: Path) -> None:
    # database.py uses a fixed sqlite URL ("sqlite:///./ocr_history.db") relative to backend cwd.
    # To keep behavior consistent, we run init from backend directory.
    backend_dir = Path(__file__).parent
    if backend_dir != Path.cwd():
        # ensure relative sqlite path matches (./ocr_history.db)
        import os

        os.chdir(str(backend_dir))

    from database import init_db  # local import to avoid import side effects for other commands

    init_db()
    print(f"[ok] init_db complete (db={db_path})")


def backup_db_cmd(db_path: Path, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)

    src = sqlite3.connect(str(db_path))
    try:
        # Ensure WAL is checkpointed as much as possible for a clean snapshot.
        try:
            src.execute("PRAGMA wal_checkpoint(FULL);")
        except Exception:
            pass

        dst = sqlite3.connect(str(out_path))
        try:
            src.backup(dst)
            dst.commit()
        finally:
            dst.close()
    finally:
        src.close()

    size = out_path.stat().st_size if out_path.exists() else 0
    print(f"[ok] backup created: {out_path} ({size} bytes)")


def restore_db_cmd(db_path: Path, from_path: Path, yes: bool) -> None:
    if not yes:
        raise SystemExit(
            "복원은 기존 DB를 덮어씁니다. 백엔드를 먼저 중지한 뒤 실행하세요.\n"
            "계속하려면 --yes 옵션을 추가하세요."
        )

    if not from_path.exists():
        raise SystemExit(f"backup 파일이 존재하지 않습니다: {from_path}")

    db_path.parent.mkdir(parents=True, exist_ok=True)

    # Move current DB aside (if exists)
    if db_path.exists():
        bak = db_path.with_suffix(f".db.bak-{_timestamp()}")
        shutil.move(str(db_path), str(bak))
        print(f"[info] current db moved to: {bak}")

    # Remove WAL/SHM files (they may refer to old DB)
    for suffix in (".db-wal", ".db-shm", ".db-wal2", ".db-shm2"):
        p = db_path.with_suffix(suffix)
        if p.exists():
            try:
                p.unlink()
            except Exception:
                pass

    shutil.copy2(str(from_path), str(db_path))
    print(f"[ok] restored db: {db_path} (from {from_path})")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="db_tools.py")
    parser.add_argument(
        "--db-path",
        default=str(_default_db_path()),
        help="SQLite DB path (default: backend/ocr_history.db)",
    )

    sub = parser.add_subparsers(dest="cmd", required=True)

    sub_init = sub.add_parser("init", help="create tables + apply lightweight migrations")

    sub_backup = sub.add_parser("backup", help="create a consistent backup snapshot")
    sub_backup.add_argument(
        "--out",
        default="",
        help="output path; default: backups/ocr_history-<utc>.db in repo root",
    )

    sub_restore = sub.add_parser("restore", help="restore DB from a backup file (destructive)")
    sub_restore.add_argument("--from", dest="from_path", required=True, help="backup file path")
    sub_restore.add_argument("--yes", action="store_true", help="confirm destructive restore")

    args = parser.parse_args(argv)
    db_path = Path(args.db_path).expanduser().resolve()

    if args.cmd == "init":
        init_db_cmd(db_path)
        return 0

    if args.cmd == "backup":
        if args.out:
            out_path = Path(args.out).expanduser().resolve()
        else:
            # default: repo_root/backups/ocr_history-<utc>.db
            repo_root = Path(__file__).resolve().parents[1]
            out_path = repo_root / "backups" / f"ocr_history-{_timestamp()}.db"
        backup_db_cmd(db_path, out_path)
        return 0

    if args.cmd == "restore":
        restore_db_cmd(db_path, Path(args.from_path).expanduser().resolve(), bool(args.yes))
        return 0

    raise SystemExit("unknown command")


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except KeyboardInterrupt:
        raise SystemExit(130)


