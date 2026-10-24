#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
exec .venv/bin/python -m uvicorn api.main:app --host 127.0.0.1 --port "${API_PORT:-8000}"
