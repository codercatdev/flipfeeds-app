import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express, { type NextFunction, type Request, type Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { onRequest } from 'firebase-functions/v2/https';
import { getAuthServerUrl, getMcpServerUrl, jwtSecret } from './auth/config';
import { verifyAccessToken } from './auth/tokens';
import { ai } from './genkit';

// ============================================================================
// FIREBASE AUTHENTICATION MIDDLEWARE (Dual Mode)
// ============================================================================

interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;
        email?: string;
    };
}

/**
 * Flexible authentication middleware that supports both:
 * 1. OAuth 2.1 access tokens (for MCP clients)
 * 2. Firebase ID tokens (for mobile app and direct access)
 */
const flexibleAuthMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                error: 'Unauthorized: Missing or invalid authorization header',
            });
            return;
        }

        const token = authHeader.split('Bearer ')[1];

        // Try OAuth access token first (if JWT_SECRET is configured)
        const secret = jwtSecret.value();
        if (secret) {
            try {
                const payload = await verifyAccessToken(token, secret);
                req.user = {
                    uid: payload.uid,
                    email: payload.email,
                };
                console.log('Authenticated via OAuth access token');
                next();
                return;
            } catch (_oauthError) {
                // Not a valid OAuth token, try Firebase ID token
                console.log('Not an OAuth token, trying Firebase ID token...');
            }
        }

        // Fall back to Firebase ID token
        try {
            const decodedToken = await getAuth().verifyIdToken(token);
            req.user = {
                uid: decodedToken.uid,
                email: decodedToken.email,
            };
            console.log('Authenticated via Firebase ID token');
            next();
            return;
        } catch (firebaseError) {
            console.error('Firebase token verification failed:', firebaseError);
            res.status(401).json({ error: 'Unauthorized: Invalid token' });
            return;
        }
    } catch (error) {
        console.error('Authentication middleware error:', error);
        res.status(500).json({ error: 'Internal server error during authentication' });
        return;
    }
};

// ============================================================================
// MCP SERVER IMPLEMENTATION
// ============================================================================

/**
 * Create and configure the MCP server with user context
 */
function createMCPServer(uid: string): Server {
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

        // Filter for flows only - exclude models and other action types
        const allActions = Object.values(actions);
        const flows = allActions.filter((a: any) => {
            // Flows are callable functions with __action metadata
            // Exclude googleai models (they start with 'googleai/')
            const flowName = a.__action?.name || '';
            return (
                typeof a === 'function' &&
                a.__action &&
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

            // Convert Zod schema to JSON schema for MCP
            const inputSchema = flowAction.inputSchema || {};

            return {
                name: flowName,
                description: flowAction.description || `Execute the ${flowName} flow`,
                inputSchema: {
                    type: 'object',
                    properties: inputSchema._def?.shape
                        ? Object.entries(inputSchema._def.shape).reduce(
                              (acc: any, [key, value]: [string, any]) => {
                                  acc[key] = {
                                      type:
                                          value._def?.typeName === 'ZodString'
                                              ? 'string'
                                              : value._def?.typeName === 'ZodNumber'
                                                ? 'number'
                                                : value._def?.typeName === 'ZodBoolean'
                                                  ? 'boolean'
                                                  : value._def?.typeName === 'ZodArray'
                                                    ? 'array'
                                                    : value._def?.typeName === 'ZodObject'
                                                      ? 'object'
                                                      : 'string',
                                      description: value._def?.description || `${key} parameter`,
                                  };
                                  return acc;
                              },
                              {}
                          )
                        : {},
                },
            };
        });

        console.log(`Listing ${tools.length} MCP tools for user ${uid}`);

        return {
            tools,
        };
    });

    // Register tool call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        console.log(`Executing flow: ${name} for user ${uid}`);
        console.log('Flow arguments:', args);

        try {
            // Get the flow from Genkit registry
            const actions = await ai.registry.listActions();
            const flowEntry = Object.values(actions).find((a: any) => a.__action?.name === name);

            if (!flowEntry) {
                throw new Error(`Flow not found: ${name}`);
            }

            // Inject uid into the arguments if not already present
            const flowArgs = {
                uid,
                ...args,
            };

            // Execute the flow - flowEntry is the callable flow function
            const result = await flowEntry(flowArgs);

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
 * https://datatracker.ietf.org/doc/html/rfc9728#section-4.1
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
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(204).send();
});

// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Apply authentication middleware and transport handler to root endpoint
app.post('/', flexibleAuthMiddleware, async (req: AuthenticatedRequest, res) => {
    if (!req.user?.uid) {
        res.status(401).json({ error: 'Unauthorized: No user ID' });
        return;
    }

    // Create a new MCP server instance for this authenticated request
    const mcpServer = createMCPServer(req.user.uid);

    // Create transport for this request
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode
    });

    // Connect the transport to the server
    mcpServer.connect(transport);

    await transport.handleRequest(req, res, req.body);
});

// Also support /mcp path for backwards compatibility
app.post('/mcp', flexibleAuthMiddleware, async (req: AuthenticatedRequest, res) => {
    if (!req.user?.uid) {
        res.status(401).json({ error: 'Unauthorized: No user ID' });
        return;
    }

    // Create a new MCP server instance for this authenticated request
    const mcpServer = createMCPServer(req.user.uid);

    // Create transport for this request
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode
    });

    // Connect the transport to the server
    mcpServer.connect(transport);

    await transport.handleRequest(req, res, req.body);
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
 *
 * Usage with Firebase ID Token:
 * POST https://your-region-your-project.cloudfunctions.net/mcpServer
 * Headers:
 *   Authorization: Bearer <firebase-id-token>
 *   Content-Type: application/json
 *   Accept: application/json, text/event-stream
 *
 * Usage with OAuth Access Token:
 * POST https://your-region-your-project.cloudfunctions.net/mcpServer
 * Headers:
 *   Authorization: Bearer <oauth-access-token>
 *   Content-Type: application/json
 *   Accept: application/json, text/event-stream
 */
export const mcpServer = onRequest(
    {
        cors: true,
        maxInstances: 10,
        secrets: [jwtSecret], // Optional - only needed for OAuth support
    },
    app
);
