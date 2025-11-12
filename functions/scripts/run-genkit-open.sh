#!/bin/bash
# Load .env and start Genkit UI

set -a  # automatically export all variables
[ -f .env ] && source .env
set +a

genkit start --port 4001 -- node lib/genkit-dev.js
