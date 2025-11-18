import type { Genkit } from 'genkit';
import { z } from 'zod';
import { requireAuth } from '../auth/contextProvider';
import { FeedSchema } from '../tools/feedTools';

/**
 * Register all feed agents with the provided Genkit instance.
 */
export function registerFeedFlows(ai: Genkit) {
  /**
   * Feed Creation Agent
   *
   * Handles feed creation with AI-assisted validation and setup.
   */
  const feedCreationAgentAction = ai.defineFlow(
    {
      name: 'feedCreationAgent',
      metadata: {
        description: 'An intelligent assistant for creating and configuring new feeds',
      },
      inputSchema: z.object({
        name: z.string(),
        description: z.string(),
        visibility: z.enum(['public', 'private']),
      }),
      outputSchema: z.object({ feedId: z.string() }),
    },
    async (data, { context }) => {
      const auth = requireAuth(context);

      const result = await ai.generate({
        model: 'googleai/gemini-2.5-flash-lite',
        prompt: `Create a new feed for user ${auth.uid}.

Feed details:
- Name: ${data.name}
- Description: ${data.description}
- Visibility: ${data.visibility}

Use the createFeed tool to create this feed. The authenticated user will automatically become the owner and admin.

Return the feedId.`,
        tools: ['createFeed'],
        output: {
          schema: z.object({ feedId: z.string() }),
        },
      });

      return { feedId: result.output?.feedId ?? '' };
    }
  );

  /**
   * Feed Management Agent
   *
   * Manages feed browsing, member management, and feed queries.
   */
  const feedManagementAgentAction = ai.defineFlow(
    {
      name: 'feedManagementAgent',
      metadata: {
        description: 'An intelligent assistant for managing feeds and memberships',
      },
      inputSchema: z.object({}),
      outputSchema: z.object({
        feeds: z.array(FeedSchema),
      }),
    },
    async (_data, { context }) => {
      requireAuth(context);

      const result = await ai.generate({
        model: 'googleai/gemini-2.5-flash-lite',
        prompt: `Get all feeds that the authenticated user is a member of.

Use the listUserFeeds tool to retrieve the feeds.

Return the list of feeds.`,
        tools: ['listUserFeeds'],
        output: {
          schema: z.object({ feeds: z.array(FeedSchema) }),
        },
      });

      return { feeds: result.output?.feeds ?? [] };
    }
  );

  return {
    feedCreationAgentAction,
    feedManagementAgentAction,
  };
}
