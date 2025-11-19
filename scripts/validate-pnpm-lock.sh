#!/bin/bash
# Script to validate that pnpm-lock.yaml files are in sync
# Used in pre-push git hook to prevent deployment failures

set -e

ROOT_LOCK="pnpm-lock.yaml"
WEB_LOCK="apps/web/pnpm-lock.yaml"

echo "🔍 Validating pnpm lock files are in sync..."

# Check if both files exist
if [ ! -f "$ROOT_LOCK" ]; then
  echo "❌ Root pnpm-lock.yaml not found at $ROOT_LOCK"
  exit 1
fi

if [ ! -f "$WEB_LOCK" ]; then
  echo "❌ Web pnpm-lock.yaml not found at $WEB_LOCK"
  echo "💡 Run 'pnpm sync:lock' to sync the lock file"
  exit 1
fi

# Compare the files
if ! diff -q "$ROOT_LOCK" "$WEB_LOCK" > /dev/null 2>&1; then
  echo "❌ Lock files are out of sync!"
  echo ""
  echo "The pnpm-lock.yaml files differ between:"
  echo "  - Root: $ROOT_LOCK"
  echo "  - Web:  $WEB_LOCK"
  echo ""
  echo "💡 Run 'pnpm sync:lock' to sync them before committing"
  exit 1
fi

echo "✅ Lock files are in sync"
