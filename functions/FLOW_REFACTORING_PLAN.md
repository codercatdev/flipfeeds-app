# Flow Refactoring Plan: Moving to ai.generate() with Implicit Tool Calling

## Current State Analysis

### What's Working Well ✓
- **Tool definitions** in `userTools.ts` are properly structured with Genkit `defineTool()`
- Tools are registered with the AI instance and available for use
- Security is properly implemented (using `context.auth.uid`)

### What Needs Refactoring ❌

#### 1. **userFlows.ts**
Current issues:
- `conversationalProfileFlow` directly calls tool functions (`getUserProfileTool()`, `createUserProfileTool()`, etc.)
- This bypasses Genkit's tool orchestration and implicit tool calling
- The flow is manually implementing conversational logic that the LLM should handle

**Should be**: Using `ai.generate()` with tools array, letting the LLM decide which tools to call

#### 2. **feedFlows.ts**
Current issues:
- No tools defined - flow directly manipulates Firestore
- Missing abstraction layer between flow and data operations

**Should be**: 
- Create `feedTools.ts` with proper tool definitions
- Use `ai.generate()` in flows with these tools

#### 3. **flipFlows.ts**
Current issues:
- Placeholder AI functions (`moderateVideo`, `generateVideoSummary`, `generateVideoTitle`)
- Direct Firestore manipulation
- No proper tool definitions

**Should be**:
- Create `flipTools.ts` with proper tool definitions
- Use `ai.generate()` with vertex AI for video analysis
- Implement real AI-powered moderation, summarization, and title generation

## Refactoring Strategy

### Phase 1: Update Model Configuration ✓ COMPLETED
- [x] Change default model from `gemini-1.5-flash` to `gemini-2.0-flash-exp`

### Phase 2: Refactor User Flows

#### conversationalProfileFlow
**Before** (current - 280 lines of manual logic):
```typescript
async (input, { context }) => {
  const auth = requireAuth(context);
  const profile = await getUserProfileTool({}, { auth: context?.auth as any });
  
  if (!profile) {
    await createUserProfileTool(...);
    // ... 40+ more lines of manual logic
  }
  
  // 200+ lines of if/else for handling different user messages
}
```

**After** (using ai.generate() - ~60 lines):
```typescript
async (input, { context }) => {
  const auth = requireAuth(context);
  const userMessage = input.message || 'Show me my profile';

  const result = await ai.generate({
    model: 'googleai/gemini-2.0-flash-exp',
    prompt: `You are a helpful profile assistant...
    
User request: "${userMessage}"
Current user: ${auth.uid}

Tasks:
1. Check profile with getUserProfile
2. Create if missing with createUserProfile
3. Help with updates using available tools
4. Be conversational and helpful

Return JSON with: response, profile, needsInput, suggestedActions`,
    tools: [
      'getUserProfile',
      'createUserProfile',
      'updateUserProfile',
      'isUsernameAvailable',
      'claimUsername',
      'releaseUsername',
    ],
    output: {
      schema: z.object({
        response: z.string(),
        profile: UserProfileOutputSchema.nullable(),
        needsInput: z.boolean(),
        suggestedActions: z.array(z.string()).optional(),
      }),
    },
  });

  return {
    response: result.output?.response ?? 'Error processing request',
    profile: result.output?.profile ?? undefined,
    needsInput: result.output?.needsInput ?? true,
    suggestedActions: result.output?.suggestedActions,
  };
}
```

**Benefits**:
- LLM handles conversational logic
- Automatically calls right tools based on user intent
- Much shorter, more maintainable code
- Better at handling edge cases and natural language

#### updateProfileFieldFlow
Similar refactor - let LLM handle validation logic and tool orchestration

#### profileImageAssistantFlow
This one is **hybrid**:
- Use `ai.generate()` for the conversational routing ("what does user want to do?")
- Keep procedural code for actual image generation and Firebase Storage operations
- For image generation: use `ai.generate()` with `vertexai/imagen-3.0-fast-generate-001`

### Phase 3: Create Feed Tools

Create `functions/src/tools/feedTools.ts`:
```typescript
export function registerFeedTools(ai: Genkit) {
  ai.defineTool({
    name: 'createFeed',
    description: 'Create a new feed with the authenticated user as owner',
    inputSchema: z.object({
      name: z.string(),
      description: z.string(),
      visibility: z.enum(['public', 'private']),
    }),
    outputSchema: z.object({ feedId: z.string() }),
  }, async (input, { context }) => {
    // Implementation using Firestore
  });

  ai.defineTool({
    name: 'getFeed',
    // ...
  });

  ai.defineTool({
    name: 'addMemberToFeed',
    // ...
  });

  // ... more feed tools
}
```

### Phase 4: Refactor Feed Flows

#### createFeedFlow
**Before** (current):
```typescript
async (data, { context }) => {
  // Direct Firestore manipulation
  const newFeedRef = db.collection('feeds').doc();
  await db.runTransaction(async (transaction) => {
    transaction.set(newFeedRef, { ... });
    // ... more direct DB calls
  });
}
```

**After** (using ai.generate()):
```typescript
async (data, { context }) => {
  const result = await ai.generate({
    model: 'googleai/gemini-2.0-flash-exp',
    prompt: `Create a new feed with these details:
Name: ${data.name}
Description: ${data.description}
Visibility: ${data.visibility}

Use the createFeed tool to create the feed and return the feedId.`,
    tools: ['createFeed'],
    output: {
      schema: z.object({ feedId: z.string() }),
    },
  });

  return { feedId: result.output?.feedId };
}
```

### Phase 5: Create Flip/Video Tools

Create `functions/src/tools/flipTools.ts` and `functions/src/tools/videoTools.ts`:

```typescript
// videoTools.ts
export function registerVideoTools(ai: Genkit) {
  ai.defineTool({
    name: 'moderateVideo',
    description: 'Use AI to moderate video content for safety',
    inputSchema: z.object({
      videoStoragePath: z.string(),
    }),
    outputSchema: z.object({
      isSafe: z.boolean(),
      reasons: z.array(z.string()).optional(),
    }),
  }, async (input) => {
    // Use Vertex AI video moderation
    const result = await ai.generate({
      model: 'vertexai/gemini-1.5-pro-vision', // or appropriate video model
      prompt: `Analyze this video for safety...`,
      // ... video analysis logic
    });
    return { isSafe: true, reasons: [] };
  });

  ai.defineTool({
    name: 'generateVideoSummary',
    description: 'Generate a text summary of video content using AI',
    inputSchema: z.object({
      videoStoragePath: z.string(),
    }),
    outputSchema: z.string(),
  }, async (input) => {
    const result = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Analyze this video and create a brief summary...`,
      // ... video analysis logic
    });
    return result.text;
  });

  ai.defineTool({
    name: 'generateVideoTitle',
    description: 'Generate an engaging title for a video using AI',
    inputSchema: z.object({
      videoStoragePath: z.string(),
      summary: z.string().optional(),
    }),
    outputSchema: z.string(),
  }, async (input) => {
    const result = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Create an engaging title for this video${input.summary ? ` based on this summary: ${input.summary}` : ''}`,
    });
    return result.text;
  });
}

// flipTools.ts
export function registerFlipTools(ai: Genkit) {
  ai.defineTool({
    name: 'createFlip',
    description: 'Create a new flip (video post) in a feed',
    inputSchema: z.object({
      feedId: z.string(),
      videoStoragePath: z.string(),
      title: z.string().optional(),
    }),
    outputSchema: z.object({ flipId: z.string() }),
  }, async (input, { context }) => {
    // Firestore transaction to create flip
  });
}
```

### Phase 6: Refactor Flip Flows

#### createFlipFlow
**After**:
```typescript
async (data, { context }) => {
  const result = await ai.generate({
    model: 'googleai/gemini-2.0-flash-exp',
    prompt: `Create a new flip (video post) with these details:
Feed ID: ${data.feedId}
Video: ${data.videoStoragePath}
Title: ${data.title || 'generate one'}

Steps:
1. Moderate the video with moderateVideo tool
2. If safe, generate a summary with generateVideoSummary
3. If no title provided, generate one with generateVideoTitle
4. Create the flip with createFlip tool

Return the flip ID.`,
    tools: [
      'moderateVideo',
      'generateVideoSummary',
      'generateVideoTitle',
      'createFlip',
    ],
    output: {
      schema: z.object({ flipId: z.string() }),
    },
  });

  return { flipId: result.output?.flipId };
}
```

## Model Selection Guidelines

### Use `googleai/gemini-2.0-flash-exp` (Gemini 2.5 Flash) for:
- Conversational flows
- Text generation (titles, summaries)
- Structured output with tools
- Fast, cost-effective operations
- **Default for most flows**

### Use `vertexai/imagen-3.0-fast-generate-001` for:
- Image generation (profile pictures, etc.)
- Any visual content creation

### Use `googleai/gemini-1.5-pro` or `vertexai/gemini-1.5-pro-vision` for:
- Video content analysis
- Complex reasoning tasks
- When you need higher quality over speed

## Benefits of This Refactoring

1. **Shorter, Cleaner Code**: Flows become 60-80% shorter
2. **Better Maintainability**: Logic is in prompts, not code
3. **More Flexible**: LLM handles edge cases naturally
4. **True AI-First**: Leverages LLM reasoning vs manual if/else
5. **Observability**: Genkit Developer UI shows tool calls
6. **Testable**: Can test tools independently from flows

## Migration Checklist

### User Flows
- [ ] Refactor `conversationalProfileFlow` to use `ai.generate()` with tools
- [ ] Refactor `updateProfileFieldFlow` to use `ai.generate()` with tools
- [ ] Refactor `profileImageAssistantFlow` image generation to use vertex imagen via `ai.generate()`
- [ ] Update tests in `functions/test/userFlows.test.js`

### Feed Flows
- [ ] Create `feedTools.ts` with all feed operations as tools
- [ ] Register feed tools in `genkit.ts`
- [ ] Refactor `createFeedFlow` to use `ai.generate()` with tools
- [ ] Create additional feed flows (list, update, delete, etc.)
- [ ] Create tests in `functions/test/feedFlows.test.js`

### Flip Flows
- [ ] Create `videoTools.ts` with AI video analysis tools
- [ ] Create `flipTools.ts` with flip CRUD operations as tools
- [ ] Register tools in `genkit.ts`
- [ ] Refactor `createFlipFlow` to use `ai.generate()` with real AI tools
- [ ] Create additional flip flows (list, update, delete, etc.)
- [ ] Update tests in `functions/test/flipFlows.test.js`

### Infrastructure
- [x] Update default model to `gemini-2.0-flash-exp`
- [ ] Update `AGENTS.md` with new patterns
- [ ] Document the ai.generate() pattern for future development
- [ ] Run full test suite
- [ ] Test in Genkit Developer UI
- [ ] Deploy and test in Firebase emulators

## Next Steps

1. Start with user flows (lowest risk, already have tools)
2. Create feed tools and flows (medium complexity)
3. Create video/flip tools and flows (highest complexity)
4. Update all tests to match new patterns
5. Update documentation

## Questions to Resolve

1. Should we keep some flows procedural if they're not conversational? (e.g., simple CRUD)
2. How to handle video uploads in tools vs flows?
3. What's the right balance between prompt instructions and code logic?
4. How to handle long-running operations (video processing)?
