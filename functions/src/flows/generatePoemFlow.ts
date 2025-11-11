import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit';
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
        async ({ subject }, { sendChunk }) => {
            const { stream, response } = ai.generateStream({
                prompt: `Compose a poem about ${subject}.`,
            });
            for await (const chunk of stream) {
                // Here, you could process the chunk in some way before sending it to
                // the output stream via sendChunk(). In this example, we output
                // the text of the chunk, unmodified.
                console.log('Sending chunk:', chunk.text);
                sendChunk(chunk.text);
            }
            const { text } = await response;
            return {
                poem: text,
            };
        }
    );
};
