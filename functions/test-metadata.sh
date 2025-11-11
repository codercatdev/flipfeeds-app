#!/bin/bash

# MCP Server Metadata Discovery Test Script
# Run this after starting the Firebase emulator

echo "🔍 Testing MCP Metadata Discovery Endpoints"
echo "==========================================="
echo ""
echo "🌐 Using Firebase Hosting URL (with rewrites)"
echo "   The .well-known endpoints are now at the ROOT level"
echo ""

# Use the hosting emulator port (5002) with localhost (not 127.0.0.1)
BASE_URL="http://localhost:5002"

echo "1️⃣  Testing Protected Resource Metadata (at root)"
echo "URL: ${BASE_URL}/.well-known/oauth-protected-resource"
echo ""
curl -s "${BASE_URL}/.well-known/oauth-protected-resource" | jq '.'
echo ""
echo "==========================================="
echo ""

echo "2️⃣  Testing Authorization Server Metadata (at root)"
echo "URL: ${BASE_URL}/.well-known/oauth-authorization-server"
echo ""
curl -s "${BASE_URL}/.well-known/oauth-authorization-server" | jq '.'
echo ""
echo "==========================================="
echo ""

echo "3️⃣  Testing OpenID Configuration (at root)"
echo "URL: ${BASE_URL}/.well-known/openid-configuration"
echo ""
curl -s "${BASE_URL}/.well-known/openid-configuration" | jq '.'
echo ""
echo "==========================================="
echo ""

echo "4️⃣  Testing MCP Endpoint (via hosting rewrite)"
echo "URL: ${BASE_URL}/mcp (should reach mcpServer function)"
echo ""
echo "Note: This will fail without authentication, but confirms routing works"
curl -s "${BASE_URL}/mcp" -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"ping"}' | head -20
echo ""
echo "==========================================="
echo ""

echo "✅ All metadata endpoints tested!"
echo ""
echo "📝 Note: If you see errors, make sure:"
echo "   - Firebase emulator is running (npm run emulators)"
echo "   - BOTH hosting AND functions emulators are running"
echo "   - Functions have been built (npm run build in functions/)"
echo "   - jq is installed for JSON formatting (brew install jq)"
echo ""
echo "🎯 For MCP clients, use: ${BASE_URL}/mcp"
