#!/bin/bash
# Load .env and start Genkit in dev mode with TypeScript watch

# Set working directory to the functions folder
cd "$(dirname "$0")/.."

set -a  # automatically export all variables
[ -f scripts/.env ] && source scripts/.env
set +a

genkit start --port 4001 -- tsx --watch src/genkit-dev.ts
