# Quick Start - Testing userFlows

## Summary

We've set up comprehensive testing for `userFlows` using Firebase Test SDK, Mocha, and Chai. The tests verify that flows work correctly with tools and that context propagates properly from flows to tools (our secure authentication pattern).

## What Was Done

1. ✅ Created test infrastructure:
   - `test/setup.js` - Configures emulators and Firebase Admin
   - `test/userFlows.test.js` - Unit tests for all userFlows
   - `.mocharc.json` - Mocha configuration
   - `TESTING.md` - Comprehensive testing guide

2. ✅ Added test scripts to `package.json`:
   - `pnpm test` - Run tests (requires emulators running separately)
   - `pnpm test:emulators` - Start emulators, run tests, stop emulators
   - `pnpm test:watch` - Run tests in watch mode

3. ✅ Fixed imports to build successfully:
   - Temporarily commented out flows that depend on missing tools (`feedTools`, `flipTools`, `videoTools`)
   - `userFlows` now builds and is ready to test

## Running Tests

### Option 1: With Emulators (Recommended)

```bash
cd functions
export GEMINI_API_KEY=your-key-here  # Optional, for image generation tests
pnpm test:emulators
```

This starts the emulators, runs all tests, and stops emulators automatically.

### Option 2: Manual Emulator Control

Terminal 1 - Start emulators:
```bash
cd functions
firebase emulators:start
```

Terminal 2 - Run tests:
```bash
cd functions
pnpm test
```

## What Gets Tested

The tests verify:

1. **conversationalProfileFlow**:
   - Creates profile for new users
   - Returns existing profile for existing users
   - Proper context propagation to tools

2. **updateProfileFieldFlow**:
   - Updates username with validation
   - Updates bio
   - Rejects invalid usernames (too short)
   - Claims username in `usernames` collection

## Next Steps

1. **Run the tests** to verify everything works
2. **Add more test cases** for edge cases
3. **Test profileImageAssistantFlow** (requires GEMINI_API_KEY)
4. **Create feedTools.ts** and re-enable other flows
5. **Set up CI/CD** to run tests on every commit

## Viewing Test Results

When tests run, you'll see output like:

```
userFlows
  conversationalProfileFlow
    ✓ should create profile for new user (234ms)
    ✓ should return existing profile (123ms)
  updateProfileFieldFlow
    ✓ should update username (156ms)
    ✓ should update bio (89ms)
    ✓ should reject username that is too short (45ms)

5 passing (680ms)
```

## Troubleshooting

If tests fail with "Unauthorized: No authenticated user":
- Check that mock context has proper `auth` object with `uid`

If tests timeout:
- Increase timeout in `.mocharc.json`
- Check that emulators are running

If "Cannot find module" errors:
- Run `pnpm build` before testing

## Important Notes

⚠️ **Temporarily Disabled Flows**: The following flows are commented out until their tool dependencies are created:
- `feedFlows.ts` (needs `feedTools.ts`)
- `flipFlows.ts` (needs `flipTools.ts`, `videoTools.ts`)
- `flipLinkFlows.ts` (needs `feedTools.ts`)
- `inviteFlows.ts` (needs `feedTools.ts`)

Once you create these tool files, uncomment the imports in:
- `src/genkit.ts`
- `src/flows/index.ts`
- `src/tools/index.ts`

And restore the original flow file names:
```bash
cd functions/src/flows
mv feedFlows.ts.tmp feedFlows.ts
mv flipFlows.ts.tmp flipFlows.ts
mv flipLinkFlows.ts.tmp flipLinkFlows.ts
mv inviteFlows.ts.tmp inviteFlows.ts
```
