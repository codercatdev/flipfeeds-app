import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
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

// Initialize the flow
const thumbnailFlow = youtubeThumbnailFlow();

// ============================================================================
// FIREBASE AUTHENTICATION MIDDLEWARE
// ============================================================================

interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;
        email?: string;
    };
}

/**
 * Middleware to verify Firebase Authentication ID Token
 * Stores the authenticated user UID for later use
 */
const firebaseAuthMiddleware = async (
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

        const idToken = authHeader.split('Bearer ')[1];

        try {
            // Verify the ID token
            const decodedToken = await admin.auth().verifyIdToken(idToken);

            // Inject user info into request
            req.user = {
                uid: decodedToken.uid,
                email: decodedToken.email,
            };

            next();
        } catch (error) {
            console.error('Token verification failed:', error);
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Apply authentication middleware and transport handler to root endpoint
app.post('/', firebaseAuthMiddleware, async (req: AuthenticatedRequest, res) => {
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
app.post('/mcp', firebaseAuthMiddleware, async (req: AuthenticatedRequest, res) => {
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
 * Firebase HTTP Function that exposes the MCP server
 * 
 * Usage:
 * POST https://your-region-your-project.cloudfunctions.net/mcp
 * Headers:
 *   Authorization: Bearer <firebase-id-token>
 *   Content-Type: application/json
 * Body:
 *   {
 *     "prompt": "Create an eye-catching thumbnail with bold colors"
 *   }
 */
export const mcpServer = functions.https.onRequest(app);
