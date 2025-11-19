#!/bin/bash
# Script to sync pnpm-lock.yaml to apps/web for Firebase App Hosting
# Run this after any pnpm install that updates the root lock file

echo "🔄 Syncing pnpm-lock.yaml to apps/web..."
cp pnpm-lock.yaml apps/web/pnpm-lock.yaml
echo "✅ Lock file synced successfully"
