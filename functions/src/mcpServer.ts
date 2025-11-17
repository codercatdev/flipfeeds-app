/**
 * FlipFeeds MCP Server - Exposes Genkit Tools as MCP Tools
 *
 * This MCP server exposes all Genkit tools defined in the application as MCP tools.
 * Tools are accessed via ai.registry.listActions() and exposed through the MCP protocol.
 *
 * Architecture:
 * - Manual MCP server setup to expose tools
 * - Supports dual authentication (OAuth 2.1 + Firebase ID tokens)
 * - Improved authentication middleware with context provider
 * - Exposes OAuth metadata endpoint for MCP client discovery
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express, { type NextFunction, type Request, type Response } from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import type { ActionContext } from 'genkit';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getAuthServerUrl, getMcpServerUrl, jwtSecret } from './auth/config';
import { authenticateRequest, type FlipFeedsAuthContext } from './auth/contextProvider';
import { ai } from './genkit';

// ============================================================================
// AUTHENTICATED REQUEST INTERFACE
// ============================================================================

interface AuthenticatedRequest extends Request {
  auth?: FlipFeedsAuthContext;
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Flexible authentication middleware that supports both:
 * 1. OAuth 2.1 access tokens (for MCP clients)
 * 2. Firebase ID tokens (from mobile app and direct access)
 *
 * Populates req.auth with user context for downstream handlers
 */
const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    req.auth = await authenticateRequest(req);
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    console.error('Authentication error:', errorMessage);
    res.status(401).json({ error: errorMessage });
  }
};

// ============================================================================
// MCP SERVER IMPLEMENTATION
// ============================================================================

/**
 * Create and configure the MCP server with user auth context
 *
 * This function creates a new MCP server instance for each authenticated request.
 * It exposes all Genkit tools as MCP tools by:
 * 1. Listing all actions from ai.registry
 * 2. Filtering for tools (excluding models, flows, and other action types)
 * 3. Converting Zod schemas to MCP tool schemas
 * 4. Handling tool execution with the authenticated user's uid
 */
function createMCPServer(auth: FlipFeedsAuthContext): Server {
  const server = new Server(
    {
      name: 'flipfeeds-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Get all Genkit tools and expose them as MCP tools
    const actions = await ai.registry.listActions();

    // Filter for tools only - exclude models, flows, and other action types
    const allActions = Object.values(actions);
    const tools = allActions.filter((a: any) => {
      // Tools are callable functions with __action metadata
      const toolName = a.__action?.name || '';
      const actionType = a.__action?.metadata?.type;

      // Exclude all models (they have type === 'model')
      if (actionType === 'model') {
        console.log(`Filtering out model: ${toolName} (type: ${actionType})`);
        return false;
      }

      // Exclude flows (they have type === 'flow')
      if (actionType === 'flow') {
        console.log(`Filtering out flow: ${toolName} (type: ${actionType})`);
        return false;
      }

      // Only include tools (they have type === 'tool')
      if (actionType !== 'tool') {
        console.log(`Filtering out non-tool action: ${toolName} (type: ${actionType})`);
        return false;
      }

      // Exclude model namespaces (googleai/, vertexai/, etc.)
      if (
        toolName.includes('/') &&
        (toolName.startsWith('googleai/') ||
          toolName.startsWith('vertexai/') ||
          toolName.startsWith('vertexAI/'))
      ) {
        console.log(`Filtering out namespaced model/action: ${toolName}`);
        return false;
      }

      // Only include callable functions with __action metadata
      return typeof a === 'function' && a.__action;
    });

    console.log(
      `Found ${tools.length} FlipFeeds tools (filtered out ${allActions.length - tools.length} models/flows/other actions)`
    );

    const mcpTools = tools.map((tool: any) => {
      const toolAction = tool.__action;
      const originalToolName = toolAction.name;

      // Sanitize tool name to meet MCP requirements: ^[a-zA-Z0-9_-]{1,64}$
      // Replace invalid characters with underscores and truncate to 64 chars
      const toolName = originalToolName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 64);

      console.log(
        'Processing tool:',
        originalToolName,
        toolName !== originalToolName ? `(sanitized to: ${toolName})` : ''
      );

      // Convert Zod input schema to JSON Schema for MCP
      const inputSchema = toolAction.inputSchema;
      let inputJsonSchema: any = { type: 'object', properties: {} };

      if (inputSchema) {
        try {
          // Use zod-to-json-schema for proper conversion
          const rawJsonSchema = zodToJsonSchema(inputSchema, {
            name: `${toolName}Input`,
            $refStrategy: 'none',
          });

          // Remove the $schema property as MCP doesn't need it
          delete rawJsonSchema.$schema;

          // If the schema uses $ref and definitions, inline the definition
          const jsonSchemaAny = rawJsonSchema as any;
          if (jsonSchemaAny.$ref && jsonSchemaAny.definitions) {
            const refName = jsonSchemaAny.$ref.split('/').pop();
            inputJsonSchema = jsonSchemaAny.definitions[refName] || rawJsonSchema;
          } else {
            inputJsonSchema = rawJsonSchema;
          }
        } catch (error) {
          console.error(`Failed to convert input schema for ${toolName}:`, error);
          // Fallback to empty schema
          inputJsonSchema = { type: 'object', properties: {} };
        }
      }

      // Build tool description with output info if available
      const fullDescription = toolAction?.metadata?.description || `Execute the ${toolName} tool`;

      // Ensure inputSchema always has type: "object"
      if (!inputJsonSchema.type) {
        inputJsonSchema.type = 'object';
      }

      // MCP tools should NOT include outputSchema - only inputSchema
      return {
        name: toolName,
        description: fullDescription,
        inputSchema: inputJsonSchema,
      };
    });

    console.log(
      `Listing ${mcpTools.length} MCP tools for user ${auth.uid} (${auth.email || 'no email'})`
    );

    return {
      tools: mcpTools,
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    console.log(`Executing tool: ${name} for user ${auth.uid} (${auth.email || 'no email'})`);
    console.log('Tool arguments:', args);
    console.log('Context passed to tool:', JSON.stringify(auth, null, 2));

    try {
      // Get the tool from Genkit registry
      const actions = await ai.registry.listActions();
      const toolEntry = Object.values(actions).find((a: any) => a.__action?.name === name);

      if (!toolEntry) {
        throw new Error(`Tool not found: ${name}`);
      }

      // Prepare tool arguments
      // First parameter: the input arguments
      const toolArgs = {
        ...args,
      };

      // Second parameter: options object with context
      // This is how Genkit tools receive context information
      const toolContext: { context: ActionContext } = {
        context: {
          auth,
        },
      };

      // Execute the tool with both parameters
      // toolEntry(input, options) where options contains { context }
      const result = await toolEntry(toolArgs, toolContext);

      // Prepare MCP content array
      const content: any[] = [];

      // Check if result contains imageUrls (new URL-based approach for profileImageAssistantFlow)
      if (
        result &&
        typeof result === 'object' &&
        'imageUrls' in result &&
        Array.isArray(result.imageUrls)
      ) {
        console.log(`Found ${result.imageUrls.length} image URLs in response`);

        // Add the main message
        content.push({
          type: 'text',
          text: result.message || 'Images generated successfully!',
        });

        // Add each image with base64 data (for inline display) and URL (for selection)
        for (let i = 0; i < result.imageUrls.length; i++) {
          const imageInfo = result.imageUrls[i];

          // If base64 is available, show the actual image
          if (imageInfo.base64) {
            content.push({
              type: 'image',
              data: imageInfo.base64,
              mimeType: 'image/jpeg',
            });

            // Add description and URL after the image
            content.push({
              type: 'text',
              text: `**Image ${i + 1}**: ${imageInfo.description}\n\n📋 **To select this image, use this URL:**\n\`\`\`\n${imageInfo.url}\n\`\`\``,
            });
          } else {
            // Fallback if no base64
            content.push({
              type: 'text',
              text: `**Image ${i + 1}**: ${imageInfo.description}\n**URL**: ${imageInfo.url}`,
            });
          }
        }

        console.log(
          `Returning ${content.length} content items (message + ${result.imageUrls.length} images with base64 + URLs)`
        );
      }
      // Legacy: Check if result contains base64 images (backward compatibility)
      else if (
        result &&
        typeof result === 'object' &&
        'images' in result &&
        Array.isArray(result.images)
      ) {
        console.log(`Found ${result.images.length} base64 images in response (legacy)`);

        // Add each image as separate content item
        for (let i = 0; i < result.images.length; i++) {
          const image = result.images[i];
          if (image.type === 'image' && image.data && image.mimeType) {
            console.log(
              `Adding image ${i + 1}: ${image.mimeType}, size: ${image.data.length} bytes`
            );
            content.push({
              type: 'image',
              data: image.data,
              mimeType: image.mimeType,
              ...(image.annotations && { annotations: image.annotations }),
            });
          }
        }

        const { images: _images, ...resultWithoutImages } = result;
        content.push({
          type: 'text',
          text: JSON.stringify(resultWithoutImages, null, 2),
        });

        console.log(
          `Returning ${content.length} content items (${result.images.length} images + 1 text)`
        );
      } else {
        // Standard text response
        content.push({
          type: 'text',
          text: JSON.stringify(result, null, 2),
        });
      }

      // Return the result as MCP content
      return {
        content,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error executing tool ${name}:`, errorMessage);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: errorMessage }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

// ============================================================================
// EXPRESS SERVER SETUP
// ============================================================================

const app = express();

// Parse JSON bodies
app.use(express.json());

// Add CORS middleware for all requests
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle OPTIONS preflight requests
  if (_req.method === 'OPTIONS') {
    res.status(204).send();
    return;
  }

  next();
});

// ============================================================================
// METADATA ENDPOINT (OAuth Protected Resource)
// ============================================================================

/**
 * OAuth 2.0 Protected Resource Metadata
 *
 * This endpoint describes the protected resource (MCP server) and its
 * authorization requirements. Required by MCP specification.
 */
app.get('/.well-known/oauth-protected-resource', (_req, res) => {
  const mcpServerUrl = getMcpServerUrl();
  const authServerUrl = getAuthServerUrl();

  res.json({
    resource: mcpServerUrl,
    authorization_servers: [authServerUrl],
    scopes_supported: ['openid', 'profile', 'email'],
    bearer_methods_supported: ['header'],
    resource_signing_alg_values_supported: ['RS256'],
    resource_documentation: `${mcpServerUrl}/docs`,
    resource_policy_uri: `${mcpServerUrl}/policy`,
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================================================
// MCP REQUEST HANDLERS (with auth context injection)
// ============================================================================

/**
 * Main MCP endpoint at root path
 *
 * This handler:
 * 1. Authenticates the request (via authMiddleware)
 * 2. Creates a new MCP server instance with the user's uid
 * 3. Creates a transport for this specific request
 * 4. Connects the server to the transport and handles the request
 */
app.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.auth?.uid) {
    res.status(401).json({ error: 'Unauthorized: No user context' });
    return;
  }

  try {
    // Create a new MCP server instance for this authenticated request
    // Pass the full auth context so flows can access uid, email, etc.
    const mcpServer = createMCPServer(req.auth);

    // Create transport for this request (stateless mode)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // Connect the transport to the server
    mcpServer.connect(transport);

    await transport.handleRequest(req as any, res, req.body);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('MCP request handling error:', errorMessage);
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * Alternative MCP endpoint at /mcp path (for backwards compatibility)
 */
app.post('/mcp', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.auth?.uid) {
    res.status(401).json({ error: 'Unauthorized: No user context' });
    return;
  }

  try {
    // Create a new MCP server instance for this authenticated request
    // Pass the full auth context so flows can access uid, email, etc.
    const mcpServer = createMCPServer(req.auth);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    mcpServer.connect(transport);
    await transport.handleRequest(req as any, res, req.body);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('MCP request handling error:', errorMessage);
    res.status(500).json({ error: errorMessage });
  }
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// FIREBASE FUNCTION EXPORT
// ============================================================================

/**
 * Firebase HTTP Function (v2) that exposes the MCP server
 *
 * Supports dual authentication modes:
 * 1. OAuth 2.1 access tokens (from mcpAuthServer)
 * 2. Firebase ID tokens (from mobile app or direct access)
 */
export const mcpServerFunc = onRequest(
  {
    cors: true,
    maxInstances: 10,
    secrets: [jwtSecret],
  },
  app
);
