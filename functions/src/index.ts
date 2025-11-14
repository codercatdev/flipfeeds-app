// Import Genkit instance and all flows
// This ensures flows are registered with Genkit before MCP server starts
// Note: Firebase Admin is initialized in genkit.ts
import './genkit';

// Export OAuth Authorization Server (handles OAuth 2.1 flow)
export { mcpAuthServer } from './auth/authServer';
// Export Protected Resource Metadata (MCP discovery endpoint)
export { mcpProtectedResource } from './auth/protectedResource';
// Export Genkit flows as Cloud Functions
export { conversationalProfileFlow } from './genkit';
// Export MCP Server (supports both OAuth and Firebase ID token auth)
// Built with genkitx-mcp package for automatic tool/flow exposure
export { mcpServerFunc as mcpServer } from './mcpServer';

// Note: Flows are auto-registered when genkit.ts is imported
// The mcpServer accesses them via ai.registry.listActions()
