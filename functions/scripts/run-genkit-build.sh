#!/bin/bash
# Load .env and start Genkit with pre-built JS

# Set working directory to the functions folder
cd "$(dirname "$0")/.."

set -a  # automatically export all variables
[ -f .env ] && source .env
set +a

# Start Genkit with compiled JS
genkit start --port 4001 -- node lib/genkit-dev.js
