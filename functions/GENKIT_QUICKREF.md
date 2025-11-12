# Genkit Quick Reference

## Architecture Summary

**Single Source of Truth**: `genkit.ts`
- Initialize Genkit
- Import all flows
- Export `ai` instance

**Entry Points**:
- **CLI**: `genkit-dev.ts` (re-exports from `genkit.ts`)
- **Production**: `index.ts` (imports `genkit.ts`)
- **MCP**: `mcpServer.ts` (reads `ai.registry`)

## Common Commands

### Test Flows with CLI
```bash
# Start Genkit Developer UI
pnpm genkit:dev

# Opens http://localhost:4001
# - List all flows
# - Test with sample inputs
# - View execution traces
```

### Build and Deploy
```bash
# Build TypeScript
pnpm build

# Deploy to Firebase
firebase deploy --only functions

# Flows automatically exposed via MCP
```

## Add a New Flow

### Step 1: Create the flow
```typescript
// src/flows/myNewFlow.ts
import { z } from 'zod';
import { ai } from '../genkit';
import { myTool } from '../tools/myTools';

export const myNewFlow = ai.defineFlow(
    {
        name: 'myNewFlow',
        inputSchema: z.object({
            uid: z.string(),
            data: z.string(),
        }),
        outputSchema: z.object({
            result: z.string(),
        }),
    },
    async (input) => {
        const result = await myTool(input);
        return { result };
    }
);
```

### Step 2: Register in genkit.ts
```typescript
// src/genkit.ts
// ... existing imports ...
import './flows/myNewFlow';  // Add this line
```

### Step 3: Test
```bash
pnpm genkit:dev
# Your flow appears in the UI automatically
```

### That's It! ✅
- Flow available in CLI
- Flow exposed via MCP
- No other changes needed

## Add a New Tool

### Step 1: Create the tool
```typescript
// src/tools/myTools.ts
import * as admin from 'firebase-admin';

export async function myTool(input: { uid: string; data: string }) {
    const db = admin.firestore();
    // ... implementation ...
    return result;
}
```

### Step 2: Use in flow
```typescript
// src/flows/myNewFlow.ts
import { myTool } from '../tools/myTools';

export const myNewFlow = ai.defineFlow({ ... }, async (input) => {
    return await myTool(input);
});
```

## File Organization

```
src/
├── genkit.ts              # Initialize & register (EDIT THIS to add flows)
├── genkit-dev.ts          # CLI entry (never edit)
├── index.ts               # Production entry (rarely edit)
├── mcpServer.ts           # MCP exposure (rarely edit)
│
├── flows/                 # CREATE NEW FLOWS HERE
│   ├── userFlows.ts
│   ├── feedFlows.ts
│   └── myNewFlow.ts       # Your new flows
│
└── tools/                 # CREATE NEW TOOLS HERE
    ├── userTools.ts
    ├── feedTools.ts
    └── myTools.ts         # Your new tools
```

## Workflow

```
1. Create flow in flows/        ✏️
2. Create tool in tools/        ✏️
3. Import flow in genkit.ts     ➕
4. Test with pnpm genkit:dev    🧪
5. Deploy with firebase deploy  🚀
```

## Zero Duplication Rules

✅ **DO**:
- Define flows once in `flows/`
- Import flows once in `genkit.ts`
- Access flows via `ai.registry` in MCP

❌ **DON'T**:
- Import flows in multiple places
- Export flows from `index.ts`
- Manually register flows with MCP

## Debugging

### Flow not in CLI?
```bash
# Check genkit.ts imports your flow
grep "myNewFlow" src/genkit.ts

# Restart CLI
pnpm genkit:dev
```

### Flow not in MCP?
```bash
# Rebuild and deploy
pnpm build
firebase deploy --only functions

# Check logs
firebase functions:log
```

### Type errors?
```bash
# Check TypeScript
pnpm build

# Common fixes:
# - Add proper Zod schemas
# - Import types correctly
# - Export flow from file
```

## Environment Variables

### Development (.env)
```bash
GEMINI_API_KEY=your-api-key
FIRESTORE_EMULATOR_HOST=localhost:8080
```

### Production (Firebase Secrets)
```bash
firebase functions:secrets:set GEMINI_API_KEY
```

## Testing Checklist

- [ ] Flow appears in CLI at http://localhost:4001
- [ ] Flow runs successfully with test input
- [ ] Traces show correct execution
- [ ] TypeScript builds without errors (`pnpm build`)
- [ ] Deploys successfully (`firebase deploy`)
- [ ] MCP client can discover flow
- [ ] MCP client can execute flow

## Resources

- [GENKIT_ARCHITECTURE.md](./GENKIT_ARCHITECTURE.md) - Full architecture details
- [Genkit Docs](https://genkit.dev/docs/get-started/) - Official documentation
- [Flows Guide](https://genkit.dev/docs/flows/) - Creating flows
- [Tools Guide](https://genkit.dev/docs/tool-calling/) - Using tools
