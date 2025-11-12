# Genkit Data Flow - Zero Duplication

## Before (Duplicated)

```
┌─────────────────┐
│   genkit.ts     │
│ • Init Genkit   │
│ • Import flows  │──┐
└─────────────────┘  │
                     │
┌─────────────────┐  │
│ genkit-dev.ts   │  │
│ • Init Genkit   │  │  ❌ DUPLICATE
│ • Import flows  │──┤  ❌ Same code repeated
└─────────────────┘  │  ❌ Easy to get out of sync
                     │
┌─────────────────┐  │
│   index.ts      │  │
│ • Export flows  │──┘
└─────────────────┘

┌─────────────────┐
│  mcpServer.ts   │
│ • Import flows  │  ❌ More duplication
└─────────────────┘
```

## After (Single Source of Truth)

```
                    ┌─────────────────────────┐
                    │      genkit.ts          │
                    │  ✅ Single init          │
                    │  ✅ Import flows once    │
                    │  ✅ Export ai instance   │
                    └────────┬───────┬─────────┘
                             │       │
              ┌──────────────┘       └──────────────┐
              │                                     │
    ┌─────────▼──────────┐              ┌──────────▼─────────┐
    │   genkit-dev.ts    │              │     index.ts       │
    │  export * from     │              │  import './genkit' │
    │    './genkit'      │              │  export { mcp... } │
    └─────────┬──────────┘              └──────────┬─────────┘
              │                                     │
    ┌─────────▼──────────┐              ┌──────────▼─────────┐
    │   Genkit CLI UI    │              │   mcpServer.ts     │
    │  • Test flows      │              │  ai.registry.list  │
    │  • Debug traces    │              │  • Expose as MCP   │
    └────────────────────┘              └────────────────────┘
```

## Flow Registration

### How It Works

```typescript
// 1. Define a flow
// src/flows/userFlows.ts
export const getUserFlow = ai.defineFlow({ ... }, async (input) => { ... });
                                ↓
// 2. Import in genkit.ts
// src/genkit.ts
import './flows/userFlows';  // ← This registers the flow
                                ↓
// 3. Flow is now in global registry
ai.registry.listActions()
                                ↓
                    ┌───────────┴───────────┐
                    │                       │
            ┌───────▼────────┐     ┌────────▼────────┐
            │   CLI Access   │     │   MCP Access    │
            │   genkit:dev   │     │   mcpServer     │
            └────────────────┘     └─────────────────┘
```

## Developer Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                      CREATE FLOW                            │
│  1. Write flow in src/flows/myFlow.ts                       │
│  2. Add import to src/genkit.ts                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      TEST LOCALLY                           │
│  $ pnpm genkit:dev                                          │
│  → Opens http://localhost:4001                              │
│  → Select flow                                              │
│  → Enter test input                                         │
│  → View output and traces                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      DEPLOY                                 │
│  $ pnpm build                                               │
│  $ firebase deploy --only functions                         │
│  → Flow automatically exposed via MCP                       │
│  → No additional configuration needed                       │
└─────────────────────────────────────────────────────────────┘
```

## File Dependencies

```
genkit.ts (Source of Truth)
    │
    ├──> flows/
    │      ├── userFlows.ts
    │      ├── feedFlows.ts
    │      ├── flipFlows.ts
    │      ├── flipLinkFlows.ts
    │      └── inviteFlows.ts
    │
    └──> tools/
           ├── userTools.ts
           ├── feedTools.ts
           ├── flipTools.ts
           └── videoTools.ts

genkit-dev.ts → genkit.ts (re-export)
index.ts → genkit.ts (import)
mcpServer.ts → ai.registry (read-only access)
```

## Key Benefits

### ✅ Zero Duplication
- Flows imported once
- Tools used directly
- Single Genkit instance

### ✅ Easy Testing
- `pnpm genkit:dev` → instant GUI
- All flows visible
- Real-time traces

### ✅ Automatic Exposure
- Add flow → import in genkit.ts → done
- CLI sees it automatically
- MCP exposes it automatically

### ✅ Type Safety
- Single source of schemas
- TypeScript validates everything
- No version skew

## Example: Add New Flow

```typescript
// Step 1: Create flow
// src/flows/analyticsFlows.ts
import { ai } from '../genkit';
import { z } from 'zod';

export const getAnalyticsFlow = ai.defineFlow(
    {
        name: 'getAnalyticsFlow',
        inputSchema: z.object({ feedId: z.string() }),
        outputSchema: z.object({ views: z.number(), likes: z.number() }),
    },
    async (input) => {
        // Implementation
        return { views: 100, likes: 50 };
    }
);

// Step 2: Register in genkit.ts
// src/genkit.ts
import './flows/userFlows';
import './flows/feedFlows';
import './flows/flipFlows';
import './flows/flipLinkFlows';
import './flows/inviteFlows';
import './flows/analyticsFlows';  // ← Add this line

// Step 3: Test
// $ pnpm genkit:dev
// Flow appears in UI automatically!

// Step 4: Deploy
// $ pnpm build
// $ firebase deploy --only functions
// Flow exposed via MCP automatically!
```

## No More...

❌ Duplicated initialization
❌ Repeated imports
❌ Manual MCP registration
❌ Out-of-sync configs
❌ Complex setup

## Now Just...

✅ One file to edit (`genkit.ts`)
✅ One command to test (`pnpm genkit:dev`)
✅ One command to deploy (`firebase deploy`)
✅ Everything works automatically
