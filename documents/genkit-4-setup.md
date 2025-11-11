Genkit Backend - Part 4: The MCP Server (Genkit Wrapper)

genkitx-mcp

In Genkit, flows are the primary mechanism for orchestrating AI logic and can seamlessly incorporate tools as part of their execution steps. You can define a flow as a special function that wraps your AI logic and includes calls to various tools or even other flows. 
Here is how you can use them together:
Tools within Flows
A common pattern in Genkit is for a flow to define a multi-step AI workflow that involves using tools. 
Tool Calling from an LLM: A Genkit flow can call an LLM (using generate()) which, in turn, can decide to use a predefined tool (e.g., a function to fetch data from an API, access a database, etc.) based on the user's prompt. The flow manages this interaction, passing the necessary context and handling the tool's output.
Direct Tool Usage: A flow can also directly call a tool function within its logic for pre- or post-processing steps, such as data retrieval (RAG) or output validation. 
Flows as Tools
Genkit supports the architecture of multi-agent systems by allowing you to specify a flow as a tool for another agent or flow. 
This approach lets you create specialized agents (flows) for specific tasks and use a general-purpose orchestration agent (another flow) to delegate tasks to them when needed. 
Key Benefits of Combining Them
Observability: Using tools within a flow means all actions, including tool calls, are captured in the Genkit Developer UI's visual traces, making testing and debugging easier.
Type Safety: Flows and tools benefit from type-safe inputs and outputs (using Zod schemas), ensuring data consistency throughout the process.
Context Propagation: The execution context, including authentication details or specific parameters, is automatically propagated from the flow down to any tools or nested flows it calls. 
In essence, Genkit encourages the use of tools and flows together to build modular, robust, and observable AI applications. 

MCP Server
You can also expose all of the tools and prompts from a Genkit instance as an MCP server:

import { genkit, z } from 'genkit';
import { mcpServer } from 'genkitx-mcp';

const ai = genkit({});

ai.defineTool(
  {
    name: 'add',
    description: 'add two numbers together',
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    outputSchema: z.number(),
  },
  async ({ a, b }) => {
    return a + b;
  }
);

ai.definePrompt(
  {
    name: "happy",
    description: "everybody together now",
    input: {
      schema: z.object({
        action: z.string().default("clap your hands").optional(),
      }),
    },
  },
  `If you're happy and you know it, {{action}}.`
);

mcpServer(ai, { name: 'example_server', version: '0.0.1' }).start();
The above will start up an MCP server with the stdio transport that exposes a tool called add and a prompt called happy. To start the server with a different transport, use mcpServer(...).start(otherTransport).

Known Limitations
MCP prompts are only able to take string parameters, so inputs to schemas must be objects with only string property values.
MCP prompts only support user and model messages. system messages are not supported.
MCP prompts only support a single "type" within a message so you can't mix media and text in the same message.

we have an mcp server in functions, lets use this to set these up correctly using the auth I already have set