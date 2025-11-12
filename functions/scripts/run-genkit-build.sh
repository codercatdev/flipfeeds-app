#!/bin/bash
# Load .env and start Genkit with pre-built JS

set -a  # automatically export all variables
[ -f .env ] && source .env
set +a

FIRESTORE_EMULATOR_HOST=localhost:8080 genkit start --port 4001 -- node lib/genkit-dev.js
