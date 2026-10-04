#!/usr/bin/env bash
# ==============================================================================
# Agastya Homoeopathy Clinic — Unified Test Suite Runner
# Runs all unit tests directly under test/
# ==============================================================================
set -e

# Resolve script directory and root project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧪 Running Agastya Clinic Test Suite across all modules..."
echo "📂 Test Root: $ROOT_DIR/test"

cd "$ROOT_DIR"

if [ -f "$ROOT_DIR/backend/venv/bin/python" ]; then
    PYTHON_CMD="$ROOT_DIR/backend/venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

$PYTHON_CMD -m unittest discover -s test -p "test_*.py" -v
echo "✅ All tests passed successfully!"
