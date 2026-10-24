#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
.venv/bin/python -m pytest -q
.venv/bin/python scripts/export_contract.py --check
npm --prefix web run build
