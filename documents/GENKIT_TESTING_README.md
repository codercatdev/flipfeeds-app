# Testing Genkit Flows and Tools

## Quick Start

### 1. Start Firebase Emulators
```bash
pnpm emulators
```

### 2. Start Genkit CLI (in another terminal)
```bash
pnpm genkit:dev
```

### 3. Open Genkit Developer UI
The UI will automatically open at: http://localhost:4001

## What This Setup Does

- ✅ **Genkit CLI can test your flows** using the Genkit Developer UI
- ✅ **Flows use Firebase Emulators** for Firestore operations
- ✅ **Same flows as production** - no code duplication
- ✅ **Interactive testing** - test flows with custom inputs
- ✅ **Flow traces** - see step-by-step execution
- ✅ **AI integration** - test flows that use Gemini

## Files Created

1. **`functions/src/genkit-dev.ts`** - Development entry point for Genkit CLI
2. **`documents/GENKIT_CLI_TESTING.md`** - Comprehensive testing guide
3. **Updated `package.json`** scripts:
   - `pnpm genkit:dev` - Start Genkit CLI with emulator config
   - `pnpm genkit:open` - Open Genkit UI without emulators

## Key Concepts

### Two Entry Points Strategy

```
Production (genkit.ts)          Development (genkit-dev.ts)
       ↓                                    ↓
Firebase Functions              Genkit CLI Dev Server
       ↓                                    ↓
Production Firestore            Firestore Emulator
       ↓                                    ↓
   MCP Server               ←  Same Flows & Tools  →
```

Both entry points use the **exact same flows and tools**, but connect to different backends.

### Why Not Use Firebase MCP Tools?

**Current approach is better** because:
- Direct Firebase Admin SDK gives full control
- Works seamlessly with emulators
- Type-safe and well-documented
- No additional abstraction layer

**Firebase MCP tools** are designed for exposing Firebase to external MCP clients, not for internal business logic.

## Example: Testing a Flow

1. Select `createUserFlow` in Genkit UI
2. Input:
```json
{
  "uid": "test-123",
  "displayName": "Test User",
  "email": "test@example.com"
}
```
3. Click "Run"
4. View results and trace
5. Verify in Firestore Emulator UI

## See Also

- [Full Testing Guide](./GENKIT_CLI_TESTING.md)
- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [Three Platform Strategy](./THREE_PLATFORM_STRATEGY.md)
