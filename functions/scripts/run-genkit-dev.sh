#!/bin/bash
# Load .env and start Genkit in dev mode with TypeScript watch

set -a  # automatically export all variables
[ -f .env ] && source .env
set +a

FIRESTORE_EMULATOR_HOST=localhost:8080 genkit start --port 4001 -- tsx --watch src/genkit-dev.ts
