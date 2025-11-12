#!/bin/bash

# Genkit Development Helper Script
# This script helps you start the Genkit development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 FlipFeeds Genkit Development Setup${NC}"
echo ""

# Check if .env exists
if [ ! -f "functions/.env" ]; then
    echo -e "${YELLOW}⚠️  Warning: functions/.env not found${NC}"
    echo "Creating a template .env file..."
    cat > functions/.env << EOF
GEMINI_API_KEY=your-api-key-here
GCLOUD_PROJECT=demo-flipfeeds
EOF
    echo -e "${YELLOW}📝 Please edit functions/.env and add your GEMINI_API_KEY${NC}"
    echo ""
fi

# Check if emulators are running
if ! curl -s http://localhost:4000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Firebase Emulators not detected${NC}"
    echo ""
    echo "Please start the emulators in another terminal:"
    echo -e "${GREEN}  pnpm emulators${NC}"
    echo ""
    read -p "Press Enter when emulators are running, or Ctrl+C to exit..."
fi

# Build functions
echo -e "${GREEN}🔨 Building functions...${NC}"
cd functions
pnpm build

# Start Genkit
echo ""
echo -e "${GREEN}✨ Starting Genkit CLI...${NC}"
echo ""
echo "The Genkit Developer UI will open at: http://localhost:4001"
echo "Firebase Emulator UI is at: http://localhost:4000"
echo ""

# Load environment variables
cd functions
set -a
[ -f .env ] && source .env
set +a
cd ..

# Set environment variables and start
genkit start --port 4001 -- node functions/lib/genkit-dev.js
