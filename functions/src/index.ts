// Import Genkit instance and all agents
// This ensures agents are registered with Genkit before MCP server starts
// Note: Firebase Admin is initialized in genkit.ts
import './genkit';

// Export OAuth Authorization Server (handles OAuth 2.1 flow)
export { mcpAuthServer } from './auth/authServer';
// Export Protected Resource Metadata (MCP discovery endpoint)
export { mcpProtectedResource } from './auth/protectedResource';
// Export Genkit agents as Cloud Functions
// User agents
// Feed agents
// Unified Flip agent (handles all flip/video operations)
export {
  feedCreationAgent,
  feedManagementAgent,
  flipAgent,
  imageAgent,
  onboardingAgent,
  profileAgent,
} from './genkit';

// Export MCP Server (supports both OAuth and Firebase ID token auth)
// Built with genkitx-mcp package for automatic tool/agent exposure
export { mcpServerFunc as mcpServer } from './mcpServer';

// Note: Agents are auto-registered when genkit.ts is imported
// The mcpServer accesses them via ai.registry.listActions()
