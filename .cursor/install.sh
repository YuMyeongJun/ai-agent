#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap for the AI Virtual Office app.
# Prepares the frontend (Vite/React) and backend (FastAPI) dependencies.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# 1. Ensure Python venv + pip tooling is available (default image may lack it).
if ! python3 -c "import venv, ensurepip" >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq python3-venv python3-pip
fi

# 2. Frontend dependencies.
npm install

# 3. Python virtual environment + backend dependencies.
if [ ! -x ".venv/bin/python" ] || ! .venv/bin/python -m pip --version >/dev/null 2>&1; then
  rm -rf .venv
  python3 -m venv .venv
fi
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r backend/requirements.txt

# 4. Local environment file. Defaults to mock mode so the app runs without an
#    Anthropic API key. Set ANTHROPIC_API_KEY in .env to use the live Claude API.
if [ ! -f .env ]; then
  cp .env.example .env
fi

echo "install.sh complete"
