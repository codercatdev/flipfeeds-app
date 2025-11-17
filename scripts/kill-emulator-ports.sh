#!/usr/bin/env zsh
# Kill processes on Firebase Emulator ports before starting
# Reads port configuration from firebase.json

echo "🧹 Cleaning up Firebase Emulator ports..."

# Get the directory of this script (works when called from pnpm or directly)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Navigate to project root (one level up from scripts/)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FIREBASE_JSON="${PROJECT_ROOT}/firebase.json"

# Check if firebase.json exists
if [ ! -f "$FIREBASE_JSON" ]; then
  echo "❌ Error: firebase.json not found at $FIREBASE_JSON"
  exit 1
fi

# Extract ports from firebase.json using node
PORTS=$(node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$FIREBASE_JSON', 'utf8'));
const emulators = config.emulators || {};
const ports = [];

if (emulators.auth?.port) ports.push(emulators.auth.port);
if (emulators.functions?.port) ports.push(emulators.functions.port);
if (emulators.firestore?.port) ports.push(emulators.firestore.port);
if (emulators.storage?.port) ports.push(emulators.storage.port);
if (emulators.hosting?.port) ports.push(emulators.hosting.port);
if (emulators.ui?.port) ports.push(emulators.ui.port);
if (emulators.pubsub?.port) ports.push(emulators.pubsub.port);
if (emulators.database?.port) ports.push(emulators.database.port);
if (emulators.apphosting?.port) ports.push(emulators.apphosting.port);

// Add Firebase Emulator Hub default port (4400)
ports.push(4400);

console.log(ports.join(' '));
")

# Check if we got any ports
if [ -z "$PORTS" ]; then
  echo "⚠️  No emulator ports found in firebase.json"
  exit 0
fi

echo "📍 Found emulator ports: $PORTS"
echo ""

# Kill processes on each port
for PORT in $PORTS; do
  PID=$(lsof -ti:$PORT 2>/dev/null)
  if [ ! -z "$PID" ]; then
    echo "  🔪 Killing process on port $PORT (PID: $PID)"
    kill -9 $PID 2>/dev/null || true
  else
    echo "  ✓ Port $PORT is free"
  fi
done

# Clean up Next.js dev lock file if it exists
NEXT_LOCK="${PROJECT_ROOT}/apps/web/.next/dev/lock"
if [ -f "$NEXT_LOCK" ]; then
  echo ""
  echo "  🧹 Removing Next.js dev lock file"
  rm -f "$NEXT_LOCK"
fi

echo ""
echo "✅ All emulator ports cleaned"
