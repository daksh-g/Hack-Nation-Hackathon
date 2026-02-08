#!/bin/bash
# NEXUS — Start everything
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🧠 Starting NEXUS..."
echo ""

# 1. Backend
echo "→ Starting FastAPI backend on :8000..."
cd "$DIR/nexus-api"
./venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 2. Frontend
echo "→ Starting Vite dev server on :5173..."
cd "$DIR/nexus-ui"
npx vite --port 5173 --host &
FRONTEND_PID=$!

sleep 2
echo ""
echo "✅ NEXUS is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop both servers."

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo 'Stopped.'" EXIT

wait
