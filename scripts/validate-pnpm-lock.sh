#!/bin/bash
# Script to validate that apps/web has a pnpm-lock.yaml file
# Used in pre-push git hook to prevent deployment failures

set -e

WEB_LOCK="apps/web/pnpm-lock.yaml"

echo "🔍 Validating web app has a pnpm-lock.yaml..."

# Check if web lock file exists
if [ ! -f "$WEB_LOCK" ]; then
  echo "❌ Web pnpm-lock.yaml not found at $WEB_LOCK"
  echo "💡 Run 'pnpm sync:lock' to generate it"
  exit 1
fi

# Check if it's not empty
if [ ! -s "$WEB_LOCK" ]; then
  echo "❌ Web pnpm-lock.yaml is empty"
  echo "💡 Run 'pnpm sync:lock' to generate it"
  exit 1
fi

echo "✅ Web app lock file exists"
