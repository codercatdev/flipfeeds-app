import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Import Genkit instance and all flows
// This ensures flows are registered with Genkit before MCP server starts
import './genkit';

// Export OAuth Authorization Server (handles OAuth 2.1 flow)
export { mcpAuthServer } from './auth/authServer';
// Export Protected Resource Metadata (MCP discovery endpoint)
export { mcpProtectedResource } from './auth/protectedResource';
// Export MCP Server (supports both OAuth and Firebase ID token auth)
export { mcpServer } from './mcpServer';

// Note: Flows are auto-registered when genkit.ts is imported
// The mcpServer accesses them via ai.registry.listActions()
