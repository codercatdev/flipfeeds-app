import { z } from 'genkit';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
export const generatePoemFlow = () => {
    const ai = genkit({
        plugins: [googleAI()],
        model: 'googleai/gemini-2.5-flash',
    });
    return ai.defineFlow(
        {
            name: 'generatePoem',
            inputSchema: z.object({ subject: z.string() }),
            outputSchema: z.object({ poem: z.string() }),
        },
        async ({ subject }) => {
            const { text } = await ai.generate({
                prompt: `Compose a poem about ${subject}.`
            });
            return { poem: text };
        },
    );
};
