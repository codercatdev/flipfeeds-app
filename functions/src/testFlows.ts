/**
 * Test endpoint to verify Genkit flows are working
 *
 * This creates simple HTTP endpoints to test each flow
 * Once verified, we can expose them via MCP
 */

import { z } from 'zod';
import { ai } from './genkit';

// ============================================================================
// Test: List all registered flows
// ============================================================================

/**
 * Test Flow: List All Flows
 */
export const listFlowsFlow = ai.defineFlow(
    {
        name: 'listFlowsFlow',
        inputSchema: z.object({}),
        outputSchema: z.object({
            flows: z.array(z.string()),
        }),
    },
    async () => {
        const actions = await ai.registry.listActions();
        const flows = Object.values(actions).filter((a: any) => a.__action?.type === 'flow');
        return {
            flows: flows.map((f: any) => f.__action.name),
        };
    }
);

console.log('✅ Test flows exported');
