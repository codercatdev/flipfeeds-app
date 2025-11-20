#!/bin/bash
# Delete all Firebase Cloud Functions

echo "🔍 Fetching list of all deployed functions..."

# Get all function entry points
FUNCTIONS=$(firebase functions:list --json | jq -r '.result[].entryPoint')

if [ -z "$FUNCTIONS" ]; then
  echo "❌ No functions found or unable to fetch functions list"
  exit 1
fi

echo "📋 Found the following functions:"
echo "$FUNCTIONS"
echo ""
read -p "⚠️  Are you sure you want to delete ALL functions? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ] && [ "$CONFIRM" != "y" ]; then
  echo "❌ Aborted"
  exit 0
fi

echo "🗑️  Deleting all functions..."

# Join all function names with spaces and remove trailing space
FUNC_LIST=$(echo "$FUNCTIONS" | tr '\n' ' ' | sed 's/ $//')

# Delete all functions in one call (unquoted to pass as separate arguments)
firebase functions:delete --force $FUNC_LIST

echo "✅ All functions deleted!"