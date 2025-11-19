// Import Genkit instance and all agents ONLY for Genkit-related functions
// This ensures agents are registered with Genkit before MCP server starts
// Note: Firebase Admin is initialized in genkit.ts

// IMPORTANT: We don't import './genkit' here to avoid slow cold starts
// Each function that needs Genkit will import it directly

// Export OAuth Authorization Server (handles OAuth 2.1 flow)
export { mcpAuthServer } from './auth/authServer';
// Export Protected Resource Metadata (MCP discovery endpoint)
export { mcpProtectedResource } from './auth/protectedResource';

// Export Authentication Blocking Functions
export {
  beforeUserCreated,
  beforeUserSignedIn,
} from './functions/authBlocking';

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
