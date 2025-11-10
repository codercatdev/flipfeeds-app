import { getAuth } from 'firebase-admin/auth';
import { onRequest } from 'firebase-functions/v2/https';
import express, { Request, Response, NextFunction } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { getYouTubeChannelTool } from './tools/getYouTubeChannelTool';
import { listLatestVideosTool } from './tools/listLatestVideosTool';
import { createThumbnailsTool } from './tools/createThumbnailsTool';
import { youtubeThumbnailFlow } from './flows/youtubeThumbnailFlow';
import { jwtSecret, getMcpServerUrl, getAuthServerUrl } from './auth/config';
import { verifyAccessToken } from './auth/tokens';

// Initialize the flow
const thumbnailFlow = youtubeThumbnailFlow();

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
            res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
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
            } catch (oauthError) {
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
            name: 'flipfeeds-youtube-thumbnail-server',
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
        return {
            tools: [
                {
                    name: 'getYouTubeChannel',
                    description: 'Retrieves the YouTube channel ID for the authenticated user from Firestore',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: [],
                    },
                },
                {
                    name: 'listLatestVideos',
                    description: 'Lists the latest videos from a YouTube channel',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            channelId: {
                                type: 'string',
                                description: 'The YouTube channel ID',
                            },
                            maxResults: {
                                type: 'number',
                                description: 'Maximum number of videos to return',
                                default: 10,
                            },
                        },
                        required: ['channelId'],
                    },
                },
                {
                    name: 'createThumbnails',
                    description: 'Generates thumbnail design ideas based on video content and prompt',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            videoId: {
                                type: 'string',
                                description: 'The YouTube video ID',
                            },
                            prompt: {
                                type: 'string',
                                description: 'User prompt for thumbnail generation',
                            },
                            videoTitle: {
                                type: 'string',
                                description: 'The video title',
                            },
                        },
                        required: ['videoId', 'prompt', 'videoTitle'],
                    },
                },
                {
                    name: 'youtubeThumbnailFlow',
                    description: 'Complete workflow to generate YouTube thumbnails for the authenticated user',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            prompt: {
                                type: 'string',
                                description: 'User prompt for thumbnail generation',
                            },
                        },
                        required: ['prompt'],
                    },
                },
            ],
        };
    });

    // Register tool call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        try {
            switch (name) {
                case 'getYouTubeChannel': {
                    // Use the authenticated uid instead of args.uid
                    const result = await getYouTubeChannelTool({ uid });
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result, null, 2),
                            },
                        ],
                    };
                }

                case 'listLatestVideos': {
                    const { channelId, maxResults = 10 } = args as { channelId: string; maxResults?: number };
                    const result = await listLatestVideosTool({ channelId, maxResults });
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result, null, 2),
                            },
                        ],
                    };
                }

                case 'createThumbnails': {
                    const result = await createThumbnailsTool(args as { videoId: string; prompt: string; videoTitle: string });
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result, null, 2),
                            },
                        ],
                    };
                }

                case 'youtubeThumbnailFlow': {
                    // Inject authenticated uid into the args
                    const { prompt } = args as { prompt: string };
                    const result = await thumbnailFlow({ uid, prompt });
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result, null, 2),
                            },
                        ],
                    };
                }

                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
app.get('/.well-known/oauth-protected-resource', (req, res) => {
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
app.options('/.well-known/oauth-protected-resource', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(204).send();
});

// Health check endpoint
app.get('/health', (req, res) => {
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
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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
