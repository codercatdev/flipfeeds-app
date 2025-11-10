import * as admin from 'firebase-admin';
import { generatePoem } from './genkit';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Cloud Functions
export { generatePoem };

// Export MCP Server (supports both OAuth and Firebase ID token auth)
export { mcpServer } from './mcpServer';

// Export OAuth Authorization Server (handles OAuth 2.1 flow)
export { mcpAuthServer } from './auth/authServer';

// Export Protected Resource Metadata (MCP discovery endpoint)
export { mcpProtectedResource } from './auth/protectedResource';