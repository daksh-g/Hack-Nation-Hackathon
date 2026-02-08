#!/bin/bash
# NEXUS Setup Script — installs all dependencies for frontend and backend
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
echo "=== NEXUS Setup ==="
echo "Project root: $PROJECT_ROOT"

# --- Frontend (nexus-ui) ---
echo ""
echo ">>> Installing frontend dependencies..."
cd "$PROJECT_ROOT/nexus-ui"
npm install
npm install tailwindcss @tailwindcss/vite react-router-dom framer-motion react-force-graph-2d lucide-react

# --- Backend (nexus-api) ---
echo ""
echo ">>> Setting up Python virtual environment..."
cd "$PROJECT_ROOT/nexus-api"
python3 -m venv venv
source venv/bin/activate
pip install fastapi 'uvicorn[standard]' networkx openai numpy pydantic python-dotenv

# --- Data scripts ---
echo ""
echo ">>> Installing data pipeline dependencies..."
cd "$PROJECT_ROOT"
source nexus-api/venv/bin/activate
pip install networkx openai numpy

echo ""
echo "=== Setup complete ==="
echo "To start frontend:  cd nexus-ui && npm run dev"
echo "To start backend:   cd nexus-api && source venv/bin/activate && uvicorn main:app --port 8000 --reload"
