#!/bin/bash
# Script to generate a standalone pnpm-lock.yaml for apps/web
# This is required for Firebase App Hosting to build correctly

echo "🔄 Generating standalone pnpm-lock.yaml for apps/web..."

# Save current directory
ORIGINAL_DIR=$(pwd)

# Navigate to apps/web
cd apps/web || exit 1

# Generate a fresh lock file for just this workspace
pnpm install --lockfile-only --ignore-workspace

# Return to original directory
cd "$ORIGINAL_DIR" || exit 1

echo "✅ Standalone lock file generated successfully"
