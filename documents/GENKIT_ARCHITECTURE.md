# Genkit Architecture - Zero Duplication Design

This document explains the streamlined Genkit architecture that eliminates code duplication and follows Genkit best practices.

## Important Terminology

### "Tools" in This Project

⚠️ **Important**: The `tools/` folder contains **utility functions**, NOT Genkit AI tools.

| Term | What It Means | Example |
|------|---------------|---------|
| **Utility Functions** (`tools/`) | Regular TypeScript functions for business logic | `getUserProfile()`, `createFeed()` |
| **Genkit Flows** (`flows/`) | AI-powered flows exposed via MCP | `getUserFlow`, `createFeedFlow` |
| **Genkit AI Tools** | Tools that AI can call (we don't use these yet) | Would be defined with `ai.defineTool()` |

**In this codebase**:
- ✅ `tools/` = Database operations, business logic, utility functions
- ✅ `flows/` = Genkit flows that USE the utility functions
- ❌ We don't currently use Genkit AI tools (those let AI call external APIs)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE SOURCE OF TRUTH                    │
│                       genkit.ts                              │
│  • Initialize Genkit with plugins                           │
│  • Import all flows (registers them)                        │
│  • Export ai instance                                       │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
    ┌──────────▼──────────┐    ┌─────────▼──────────┐
    │   genkit-dev.ts     │    │     index.ts       │
    │  • Setup emulator   │    │  • Import genkit   │
    │  • Re-export *      │    │  • Export MCP      │
    └──────────┬──────────┘    └─────────┬──────────┘
               │                          │
    ┌──────────▼──────────┐    ┌─────────▼──────────┐
    │   Genkit CLI UI     │    │   mcpServer.ts     │
    │  Test flows         │    │  Access registry   │
    └─────────────────────┘    └────────────────────┘

Data Flow:
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   tools/    │ ──>  │   flows/    │ ──>  │  genkit.ts  │
│  Utilities  │      │  Use tools  │      │  Import     │
│  (not       │      │  to build   │      │  flows      │
│  registered)│      │  flows      │      │  (register) │
└─────────────┘      └─────────────┘      └─────────────┘
```

## Core Files

### 1. `genkit.ts` - The Single Source of Truth

**Purpose**: Initialize Genkit and register all flows/tools

```typescript
// Initialize Genkit once
export const ai = genkit({
    plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
    model: 'googleai/gemini-2.5-flash',
});

// Import all flows - this registers them with Genkit
import './flows/userFlows';
import './flows/feedFlows';
import './flows/flipFlows';
import './flows/flipLinkFlows';
import './flows/inviteFlows';
```

**Key Points**:
- ✅ Single initialization point
- ✅ All flows imported here (registers them automatically)
- ✅ Used by both CLI and production

### 2. `genkit-dev.ts` - CLI Entry Point

**Purpose**: Entry point for Genkit CLI Developer UI

```typescript
// Simply re-export everything from genkit.ts
export * from './genkit';
```

**Why This Works**:
- ✅ No duplication - just re-exports
- ✅ CLI sees same config as production
- ✅ All flows automatically available

**Usage**:
```bash
pnpm genkit:dev
# Runs: genkit start -- tsx --watch src/genkit-dev.ts
```

### 3. `index.ts` - Production Entry Point

**Purpose**: Export Firebase Functions and ensure flows are registered

```typescript
import * as admin from 'firebase-admin';
admin.initializeApp();

// Import genkit to register all flows
import './genkit';

// Export functions
export { mcpAuthServer } from './auth/authServer';
export { mcpServer } from './mcpServer';
```

**Key Points**:
- ✅ Importing `./genkit` registers all flows
- ✅ No need to export flows individually
- ✅ MCP server accesses flows via registry

### 4. `mcpServer.ts` - MCP Tool Exposure

**Purpose**: Expose Genkit flows as MCP tools

```typescript
import { ai } from './genkit';

// List all registered flows
const actions = await ai.registry.listActions();
```

**Key Points**:
- ✅ Accesses flows via registry (no imports needed)
- ✅ Automatically exposes all flows as MCP tools
- ✅ No manual tool registration required

## Flow Development Workflow

### 1. Create/Edit Flows and Utility Functions

**Utility Functions** (`src/tools/`):

These are **NOT Genkit AI tools** - they are reusable TypeScript functions that handle business logic.

```typescript
// tools/userTools.ts
import * as admin from 'firebase-admin';

/**
 * Get user profile from Firestore
 * This is a regular TypeScript function, not a Genkit tool
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) return null;
    
    return {
        uid,
        displayName: data?.displayName,
        // ... more fields
    };
}
```

**Flows** (`src/flows/`):

Flows use the utility functions from `tools/`:

```typescript
// flows/userFlows.ts
import { ai } from '../genkit';
import { getUserProfile } from '../tools/userTools';  // Import utility function

export const getUserFlow = ai.defineFlow(
    {
        name: 'getUserFlow',
        inputSchema: z.object({ uid: z.string() }),
        outputSchema: UserProfileSchema,
    },
    async (input) => {
        // Call the utility function
        return await getUserProfile(input.uid);
    }
);
```

**Key Points**:
- ✅ `tools/` = Regular TypeScript functions (business logic)
- ✅ `flows/` = Genkit flows (exposed via MCP)
- ✅ Tools are NOT registered with Genkit (they're just imported/used)
- ✅ Only flows need to be imported in `genkit.ts`

### 2. Test with Genkit CLI

```bash
# Start Genkit Developer UI
pnpm genkit:dev

# Opens http://localhost:4001
# - See all flows listed
# - Test flows interactively
# - View traces and outputs
```

### 3. Deploy to Production

```bash
# Build and deploy
pnpm build
firebase deploy --only functions

# Flows automatically exposed via MCP server
# No additional configuration needed
```

## How It Works

### Flow Registration

When you define a flow using `ai.defineFlow()`:
```typescript
export const myFlow = ai.defineFlow({ ... }, async (input) => { ... });
```

Genkit automatically:
1. ✅ Registers the flow in the global registry
2. ✅ Makes it available to the CLI
3. ✅ Makes it accessible via `ai.registry.listActions()`

### No Manual Registration Needed

❌ **OLD WAY** (Duplicated):
```typescript
// genkit.ts
import './flows/userFlows';

// genkit-dev.ts
import './flows/userFlows';  // Duplicate!

// index.ts
export * from './flows/userFlows';  // Duplicate!
```

✅ **NEW WAY** (Single Source):
```typescript
// genkit.ts (only place flows are imported)
import './flows/userFlows';

// genkit-dev.ts
export * from './genkit';  // Re-export

// index.ts
import './genkit';  // Just import to register

// mcpServer.ts
const actions = await ai.registry.listActions();  // Access via registry
```

## Benefits

### 1. Zero Duplication
- Flows imported once in `genkit.ts`
- All other files reference this single source

### 2. Easy Testing
- `pnpm genkit:dev` - instant CLI access
- All flows automatically available
- No build step needed for testing

### 3. Automatic MCP Exposure
- MCP server reads from registry
- New flows automatically exposed
- No manual tool registration

### 4. Type Safety
- Single `ai` instance export
- TypeScript knows all flow types
- No version skew between CLI and production

## Common Operations

### Add a New Utility Function

1. Create the function in `tools/`:
```typescript
// tools/analyticsTools.ts
import * as admin from 'firebase-admin';

export async function getFlipAnalytics(flipId: string) {
    const db = admin.firestore();
    const doc = await db.collection('analytics').doc(flipId).get();
    return doc.data();
}
```

2. **No registration needed!** Just import it in your flow:
```typescript
// flows/analyticsFlows.ts
import { getFlipAnalytics } from '../tools/analyticsTools';
```

3. Done! ✅ Utility functions don't need to be registered anywhere.

### Add a New Flow

1. Create the flow file:
```typescript
// flows/newFeatureFlows.ts
import { ai } from '../genkit';
import { myUtilityFunction } from '../tools/myTools';  // Import utility

export const newFlow = ai.defineFlow(
    { 
        name: 'newFlow',
        inputSchema: z.object({ id: z.string() }),
        outputSchema: z.object({ result: z.string() }),
    }, 
    async (input) => {
        // Use utility functions
        const data = await myUtilityFunction(input.id);
        return { result: data };
    }
);
```

2. Import in `genkit.ts`:
```typescript
// genkit.ts
import './flows/newFeatureFlows';  // Add this line
```

3. Done! Flow is now:
   - ✅ Available in CLI
   - ✅ Exposed via MCP
   - ✅ Ready for production

### Test a Flow

```bash
# Start CLI
pnpm genkit:dev

# In UI:
# 1. Select your flow
# 2. Enter test input
# 3. Click "Run"
# 4. View output and traces
```

### Debug Flow Issues

```typescript
// flows/myFlow.ts
export const myFlow = ai.defineFlow({ ... }, async (input) => {
    console.log('Input:', input);  // Visible in CLI
    
    const result = await myTool(input);
    console.log('Result:', result);  // Visible in CLI
    
    return result;
});
```

Run `pnpm genkit:dev` and check the CLI console output.

## Environment Setup

### Development (CLI)
```bash
# .env file
GEMINI_API_KEY=your-key-here
FIRESTORE_EMULATOR_HOST=localhost:8080

# Start emulators first
firebase emulators:start

# Then start Genkit CLI
pnpm genkit:dev
```

### Production (Firebase Functions)
```bash
# Set secrets
firebase functions:secrets:set GEMINI_API_KEY

# Deploy
firebase deploy --only functions
```

## File Structure

```
functions/
├── src/
│   ├── genkit.ts              # Single source of truth (import flows here)
│   ├── genkit-dev.ts          # CLI entry (re-exports genkit.ts)
│   ├── index.ts               # Production entry (imports genkit.ts)
│   ├── mcpServer.ts           # MCP exposure (reads registry)
│   │
│   ├── flows/                 # Genkit flows (exposed as MCP tools)
│   │   ├── userFlows.ts       # User management flows
│   │   ├── feedFlows.ts       # Feed management flows
│   │   ├── flipFlows.ts       # Video/flip flows
│   │   ├── flipLinkFlows.ts   # Link management flows
│   │   └── inviteFlows.ts     # Invitation flows
│   │
│   └── tools/                 # Utility functions (NOT Genkit tools)
│       ├── userTools.ts       # User database operations
│       ├── feedTools.ts       # Feed database operations
│       ├── flipTools.ts       # Flip database operations
│       └── videoTools.ts      # Video processing functions
│
├── package.json
└── tsconfig.json
```

**Important Distinction**:
- `flows/` files use `ai.defineFlow()` → Must be imported in `genkit.ts`
- `tools/` files are regular functions → Imported directly by flows (not in `genkit.ts`)

## Key Principles

1. **Single Initialization**: Genkit initialized once in `genkit.ts`
2. **Import to Register**: Flows are registered by importing their files in `genkit.ts`
3. **Utility Functions Are Not Registered**: `tools/` functions are just imported/used by flows
4. **Registry Access**: MCP server reads flows from registry, not imports
5. **Re-export Pattern**: `genkit-dev.ts` re-exports for CLI access
6. **Zero Duplication**: No code repeated across files

**What Gets Registered**:
- ✅ Flows (`ai.defineFlow()`) → Must import in `genkit.ts`
- ❌ Utility functions (`tools/`) → Just import where needed

**Registration Flow**:
```
1. Create utility function in tools/userTools.ts
   → No registration needed

2. Import utility in flows/userFlows.ts
   → Use it in your flow

3. Import flow in genkit.ts
   → Flow is registered with Genkit
   → Flow appears in CLI
   → Flow exposed via MCP
```

## Troubleshooting

### Flow not showing in CLI?
- ✅ Check flow is imported in `genkit.ts`
- ✅ Check flow is exported from its file
- ✅ Restart CLI: `pnpm genkit:dev`

### Flow not in MCP?
- ✅ Check `index.ts` imports `./genkit`
- ✅ Deploy functions: `firebase deploy --only functions`
- ✅ Check MCP logs for errors

### Type errors?
- ✅ Run `pnpm build` to check TypeScript
- ✅ Ensure schemas are properly defined
- ✅ Check Zod imports

## References

- [Genkit Get Started](https://genkit.dev/docs/get-started/)
- [Genkit Flows](https://genkit.dev/docs/flows/)
- [Genkit CLI](https://genkit.dev/docs/devtools/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
