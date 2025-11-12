import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export OAuth Authorization Server (handles OAuth 2.1 flow)
export { mcpAuthServer } from './auth/authServer';
// Export Protected Resource Metadata (MCP discovery endpoint)
export { mcpProtectedResource } from './auth/protectedResource';
// Export MCP Server (supports both OAuth and Firebase ID token auth)
export { mcpServer } from './mcpServer';

// Export Genkit Flows (will be implemented in phases)
// Phase 1.2 - Core flows will be exported here
