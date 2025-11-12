/**
 * FlipFeeds MCP Server - Exposes Genkit Flows as MCP Tools
 *
 * This MCP server exposes all Genkit flows defined in the application as MCP tools.
 * Flows are accessed via ai.registry.listActions() and exposed through the MCP protocol.
 *
 * Architecture:
 * - Manual MCP server setup to expose flows (genkitx-mcp only exposes tools, not flows)
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
 * It exposes all Genkit flows as MCP tools by:
 * 1. Listing all actions from ai.registry
 * 2. Filtering for flows (excluding models, tools, and other action types)
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
        // Get all Genkit flows and expose them as MCP tools
        const actions = await ai.registry.listActions();

        // Filter for flows only - exclude models, tools, and other action types
        const allActions = Object.values(actions);
        const flows = allActions.filter((a: any) => {
            // Flows are callable functions with __action metadata
            // Exclude googleai models (they start with 'googleai/')
            // Exclude tools (they have metadata.type === 'tool')
            const flowName = a.__action?.name || '';
            const actionType = a.__action?.metadata?.type;
            return (
                typeof a === 'function' &&
                a.__action &&
                actionType !== 'tool' &&
                !flowName.startsWith('googleai/') &&
                flowName !== 'generate' // Exclude the default 'generate' flow
            );
        });

        console.log(
            `Found ${flows.length} FlipFeeds flows (filtered out ${allActions.length - flows.length} models/other actions)`
        );

        const tools = flows.map((flow: any) => {
            const flowAction = flow.__action;
            const flowName = flowAction.name;

            console.log('Processing flow:', flowName);

            // Convert Zod input schema to JSON Schema for MCP
            const inputSchema = flowAction.inputSchema;
            let inputJsonSchema: any = { type: 'object', properties: {} };

            if (inputSchema) {
                try {
                    // Use zod-to-json-schema for proper conversion
                    const rawJsonSchema = zodToJsonSchema(inputSchema, {
                        name: `${flowName}Input`,
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
                    console.error(`Failed to convert input schema for ${flowName}:`, error);
                    // Fallback to empty schema
                    inputJsonSchema = { type: 'object', properties: {} };
                }
            }

            // Convert Zod output schema to JSON Schema for documentation
            const outputSchema = flowAction.outputSchema;
            let outputJsonSchema: any = null;

            if (outputSchema) {
                try {
                    const rawOutputSchema = zodToJsonSchema(outputSchema, {
                        name: `${flowName}Output`,
                        $refStrategy: 'none',
                    });
                    delete rawOutputSchema.$schema;

                    // Inline the definition if using $ref
                    const outputSchemaAny = rawOutputSchema as any;
                    if (outputSchemaAny.$ref && outputSchemaAny.definitions) {
                        const refName = outputSchemaAny.$ref.split('/').pop();
                        outputJsonSchema = outputSchemaAny.definitions[refName] || rawOutputSchema;
                    } else {
                        outputJsonSchema = rawOutputSchema;
                    }
                } catch (error) {
                    console.error(`Failed to convert output schema for ${flowName}:`, error);
                }
            }

            // Build tool description with output info if available
            let fullDescription = flowAction.description || `Execute the ${flowName} flow`;
            if (outputJsonSchema) {
                fullDescription += `\n\nReturns: ${JSON.stringify(outputJsonSchema, null, 2)}`;
            }

            return {
                name: flowName,
                description: fullDescription,
                inputSchema: inputJsonSchema,
            };
        });

        console.log(
            `Listing ${tools.length} MCP tools for user ${auth.uid} (${auth.email || 'no email'})`
        );

        return {
            tools,
        };
    });

    // Register tool call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        console.log(`Executing flow: ${name} for user ${auth.uid} (${auth.email || 'no email'})`);
        console.log('Flow arguments:', args);
        console.log('Context passed to flow:', JSON.stringify(auth, null, 2));

        try {
            // Get the flow from Genkit registry
            const actions = await ai.registry.listActions();
            const flowEntry = Object.values(actions).find((a: any) => a.__action?.name === name);

            if (!flowEntry) {
                throw new Error(`Flow not found: ${name}`);
            }

            // Prepare flow arguments
            // First parameter: the input arguments
            const flowArgs = {
                ...args,
            };

            // Second parameter: options object with context
            // This is how Genkit flows receive context information
            const flowContext: { context: ActionContext } = {
                context: {
                    auth,
                },
            };

            // Execute the flow with both parameters
            // flowEntry(input, options) where options contains { context }
            const result = await flowEntry(flowArgs, flowContext);

            // Return the result as MCP content
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Error executing flow ${name}:`, errorMessage);

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

/**
 * CORS preflight handler for OAuth metadata endpoint
 * Required for browser-based MCP clients
 */
app.options('/.well-known/oauth-protected-resource', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).send();
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
