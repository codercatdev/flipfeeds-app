# Testing Guide for FlipFeeds Functions

This guide explains how to test Firebase Cloud Functions for FlipFeeds using the Firebase Emulator Suite.

## Overview

We test our functions using:
- **Firebase Emulator Suite** - Runs local emulators for Firestore, Auth, Storage, and Functions
- **firebase-functions-test** - Firebase's official testing SDK
- **Mocha** - Test framework
- **Chai** - Assertion library

## Quick Start

### 1. Start Emulators and Run Tests

Run all tests with emulators (recommended):

```bash
cd functions
pnpm test:emulators
```

This command:
1. Starts Firebase emulators (Firestore, Auth, Storage)
2. Runs all tests
3. Automatically stops emulators when done

### 2. Run Tests Without Emulators

If emulators are already running in another terminal:

```bash
cd functions
pnpm test
```

### 3. Run Tests in Watch Mode

For development, run tests automatically on file changes:

```bash
cd functions
pnpm test:watch
```

## Test Structure

### Test Files

Tests are located in `functions/test/`:
- `setup.js` - Global test setup (emulator config, Firebase init)
- `*.test.js` - Test files for each flow/tool

### Test Setup

The `setup.js` file configures:
- Emulator connection settings
- Firebase Admin initialization
- Environment variables
- Global test utilities

### Writing Tests

Example test for `conversationalProfileFlow`:

```javascript
const test = require('firebase-functions-test')();
const admin = require('firebase-admin');
const { expect } = require('chai');

// Import your functions
const myFunctions = require('../lib/flows/userFlows');

describe('userFlows', () => {
  let db;
  
  before(() => {
    db = admin.firestore();
  });

  after(() => {
    test.cleanup();
  });

  describe('conversationalProfileFlow', () => {
    const testUid = 'test-user-123';
    
    // Mock authentication context
    const mockContext = {
      auth: {
        uid: testUid,
        email: 'test@example.com',
        displayName: 'Test User',
        token: {
          email: 'test@example.com',
          email_verified: true,
        },
      },
    };

    it('should create profile for new user', async () => {
      // Call the flow with mock context
      const result = await myFunctions.conversationalProfileFlow(
        { message: 'hello' },
        { context: mockContext }
      );

      // Assertions
      expect(result).to.have.property('response');
      expect(result.profile).to.have.property('uid', testUid);

      // Verify in Firestore
      const userDoc = await db.collection('users').doc(testUid).get();
      expect(userDoc.exists).to.be.true;
    });
  });
});
```

## Testing Patterns

### 1. Testing with Context (Secure Pattern)

Our tools read `uid` from `context.auth.uid`, so tests must provide proper context:

```javascript
const mockContext = {
  auth: {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    token: {
      email: 'test@example.com',
      email_verified: true,
    },
  },
};

// Call flow with context
const result = await myFlow({ input: 'data' }, { context: mockContext });
```

### 2. Testing Data Flow

Verify that:
1. **Input is processed correctly**
2. **Firestore is updated**
3. **Output matches expectations**

```javascript
it('should update username', async () => {
  // 1. Call the flow
  const result = await myFunctions.updateProfileFieldFlow(
    { field: 'username', value: 'newusername' },
    { context: mockContext }
  );

  // 2. Assert output
  expect(result).to.have.property('success', true);
  expect(result.profile).to.have.property('username', 'newusername');

  // 3. Verify in Firestore
  const userDoc = await db.collection('users').doc(testUid).get();
  expect(userDoc.data()).to.have.property('username', 'newusername');
});
```

### 3. Testing Error Cases

Test that functions handle errors correctly:

```javascript
it('should reject invalid username', async () => {
  const result = await myFunctions.updateProfileFieldFlow(
    { field: 'username', value: 'ab' }, // Too short
    { context: mockContext }
  );

  expect(result).to.have.property('success', false);
  expect(result.message).to.include('3 and 20 characters');
});
```

### 4. Setup and Teardown

Clean up test data before/after each test:

```javascript
beforeEach(async () => {
  // Create test data
  await db.collection('users').doc(testUid).set({
    displayName: 'Test User',
    feedCount: 0,
  });
});

afterEach(async () => {
  // Clean up test data
  await db.collection('users').doc(testUid).delete();
});
```

## Environment Configuration

### Required Environment Variables

Set in `functions/test/setup.js`:

- `FIRESTORE_EMULATOR_HOST=localhost:8080`
- `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099`
- `FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199`
- `GCLOUD_PROJECT=demo-flipfeeds-test`
- `GEMINI_API_KEY=<your-key>` (for image generation tests)

### Setting GEMINI_API_KEY

For tests that use AI image generation:

```bash
export GEMINI_API_KEY=your-actual-key
pnpm test:emulators
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Functions

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm install -g firebase-tools
      - run: cd functions && pnpm install
      - run: cd functions && pnpm test:emulators
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

## Debugging Tests

### View Emulator UI

When emulators are running, open: http://localhost:4000

The UI shows:
- **Firestore data** - Inspect collections and documents
- **Auth users** - View test users
- **Function logs** - See console output
- **Request history** - Track all operations

### Enable Verbose Logging

Add to your test file:

```javascript
process.env.DEBUG = 'firebase:*';
```

### Inspect Function Context

Add logging in your flows:

```javascript
async (input, { context }) => {
  console.log('[DEBUG] Input:', JSON.stringify(input));
  console.log('[DEBUG] Context:', JSON.stringify(context, null, 2));
  // ... rest of flow
}
```

## Common Issues

### 1. Tests Fail: "Unauthorized: No authenticated user"

**Cause**: Context not provided or malformed

**Solution**: Ensure mock context has proper structure:

```javascript
const mockContext = {
  auth: {
    uid: 'test-user-123',        // Required
    email: 'test@example.com',   // Required
    token: { /* ... */ },         // Optional
  },
};
```

### 2. Tests Timeout

**Cause**: Emulators not running or function has infinite loop

**Solution**: 
- Check emulators are running: `firebase emulators:start`
- Increase timeout in `.mocharc.json`: `"timeout": 20000`

### 3. "Cannot find module" Errors

**Cause**: TypeScript not compiled

**Solution**: Run `pnpm build` before testing:

```bash
cd functions
pnpm build
pnpm test
```

### 4. Stale Test Data

**Cause**: Previous test didn't clean up

**Solution**: Reset emulator data:

```bash
firebase emulators:start --import=./emulator-data --export-on-exit
# Stop and restart to reset
```

## Best Practices

### ✅ DO

- Test with emulators (`pnpm test:emulators`)
- Use mock contexts with proper auth structure
- Clean up test data in `afterEach` hooks
- Test both success and error cases
- Verify Firestore state after operations
- Use descriptive test names

### ❌ DON'T

- Test against production Firebase projects
- Hardcode real user UIDs in tests
- Skip cleanup (causes flaky tests)
- Test without proper context
- Commit service account keys

## Running Specific Tests

```bash
# Run all tests
pnpm test:emulators

# Run specific test file
pnpm test -- test/userFlows.test.js

# Run tests matching pattern
pnpm test -- --grep "username"

# Run in watch mode
pnpm test:watch
```

## Next Steps

1. **Write more tests** - Add tests for `feedFlows`, `flipFlows`, etc.
2. **Add integration tests** - Test cross-flow interactions
3. **Set up CI/CD** - Automate testing on every commit
4. **Test MCP server** - Add tests for MCP endpoints
5. **Performance tests** - Measure and optimize function execution time

## Resources

- [Firebase Test SDK Docs](https://firebase.google.com/docs/functions/unit-testing)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Mocha Documentation](https://mochajs.org/)
- [Chai Assertion Library](https://www.chaijs.com/)
