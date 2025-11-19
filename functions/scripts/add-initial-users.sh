#!/bin/bash

# Quick setup script to add initial allowed users
# Usage: ./add-initial-users.sh

echo "🔐 FlipFeeds - Adding Initial Allowed Users"
echo "============================================"
echo ""

# Check if we're using emulator or production
if [ -n "$FIRESTORE_EMULATOR_HOST" ]; then
    echo "📍 Mode: Emulator ($FIRESTORE_EMULATOR_HOST)"
else
    echo "📍 Mode: Production"
    echo ""
    read -p "⚠️  Are you sure you want to modify PRODUCTION? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 1
    fi
fi

echo ""
echo "Add your email addresses (one per line, empty line to finish):"
echo ""

emails=()
while true; do
    read -p "Email: " email
    if [ -z "$email" ]; then
        break
    fi
    emails+=("$email")
done

if [ ${#emails[@]} -eq 0 ]; then
    echo "No emails provided. Exiting."
    exit 0
fi

echo ""
echo "Adding ${#emails[@]} user(s)..."
echo ""

for email in "${emails[@]}"; do
    node scripts/manage-allowed-users.js add "$email"
done

echo ""
echo "✅ Setup complete!"
echo ""
echo "View all allowed users:"
echo "  node scripts/manage-allowed-users.js list"
