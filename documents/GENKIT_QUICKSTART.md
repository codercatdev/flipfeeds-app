# Genkit CLI - Quick Reference

## ✅ Fixed Scripts

The `--attach` flag error has been fixed! Here are the correct commands:

### Option 1: TypeScript Watch Mode (Recommended for Development)
```bash
pnpm genkit:dev
```
- ✅ Automatically reloads on code changes
- ✅ No need to rebuild
- ✅ Uses `tsx` to run TypeScript directly

### Option 2: Pre-built JavaScript
```bash
pnpm genkit:dev:build
```
- Builds TypeScript first
- Then starts Genkit CLI
- Useful if you prefer compiled output

### Option 3: Standalone (No Emulators)
```bash
pnpm genkit:open
```
- Opens Genkit UI without emulator configuration
- Use when you don't need Firestore

## 📋 Complete Workflow

### Terminal 1: Firebase Emulators
```bash
pnpm emulators
```

### Terminal 2: Genkit CLI
```bash
pnpm genkit:dev
```

### Browser
- Genkit UI: http://localhost:4001
- Firebase Emulator UI: http://localhost:4000
- Firestore Emulator: http://localhost:4000/firestore

## 🔑 Environment Variables

The scripts automatically load from `functions/.env`:
```bash
GEMINI_API_KEY=your-key-here
GCLOUD_PROJECT=demo-flipfeeds
```

`FIRESTORE_EMULATOR_HOST` is automatically set to `localhost:8080`

## 🧪 Testing a Flow

1. Open Genkit UI (http://localhost:4001)
2. Select a flow (e.g., `createUserFlow`)
3. Enter test input:
   ```json
   {
     "uid": "test-123",
     "displayName": "Test User",
     "email": "test@example.com"
   }
   ```
4. Click "Run"
5. View results and trace

## 📁 Files Structure

```
functions/
├── src/
│   ├── genkit.ts           # Production entry (Firebase Functions)
│   ├── genkit-dev.ts       # Development entry (Genkit CLI) ✨
│   ├── flows/              # Flow definitions
│   └── tools/              # Tool implementations
├── scripts/
│   ├── run-genkit-dev.sh   # Dev mode with watch
│   ├── run-genkit-build.sh # Dev mode with pre-built JS
│   └── run-genkit-open.sh  # Standalone mode
└── .env                     # API keys (not committed)
```

## 🐛 Troubleshooting

### Error: "unknown option '--attach'"
**Fixed!** Update to latest package.json scripts.

### Error: "Cannot find module 'tsx'"
```bash
pnpm add -D tsx
```

### Error: "GEMINI_API_KEY not set"
Create `functions/.env` with your API key.

### Error: "Cannot connect to Firestore Emulator"
Make sure emulators are running in another terminal:
```bash
pnpm emulators
```

## 📚 More Info

See `documents/GENKIT_CLI_TESTING.md` for comprehensive guide.
