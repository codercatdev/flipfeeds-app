# Firebase Functions Scripts

## Set User Claims

This script allows you to set custom claims for users to control access to specific Genkit functions.

### Prerequisites

Make sure you're authenticated with Firebase:
```bash
firebase login
```

### Usage

**Basic usage - Grant access to one function:**
```bash
cd functions
npm run set-claims -- USER_UID generatePoem
```

**Grant access to multiple functions:**
```bash
npm run set-claims -- USER_UID generatePoem generateFlip
```

**List available functions:**
```bash
npm run set-claims -- --list
```

**Show help:**
```bash
npm run set-claims -- --help
```

### Examples

```bash
# Allow user to access the generatePoem function
npm run set-claims -- abc123xyz generatePoem

# Allow user to access both generatePoem and generateFlip
npm run set-claims -- abc123xyz generatePoem generateFlip
```

### How It Works

1. The script sets a custom claim called `allowedFunctions` on the user's Firebase Auth record
2. This claim contains an array of function names the user is allowed to call
3. Each Genkit function checks this claim in its `authPolicy` before executing
4. Users must sign out and sign back in for the new claims to take effect

### Finding User UIDs

You can find user UIDs in:
- Firebase Console → Authentication → Users
- Your app's user profile (if you display it)
- Firebase Auth Admin SDK using email: `admin.auth().getUserByEmail(email)`

### Security Notes

- Users must have verified email addresses (`email_verified: true`)
- Users must be in the `allowedFunctions` array for the specific function they're calling
- Claims are set on the server and cannot be modified by the client
- Users need to refresh their auth token (sign out/in) to get updated claims

---

## Genkit Development Scripts

### Environment Configuration

All scripts now use the `.env` file for configuration. Copy `example.secret.local` to `.env` and configure:

```bash
cp example.secret.local .env
```

Required variables in `.env`:
- `GCLOUD_PROJECT` - Your Firebase project ID (e.g., "flipfeeds-app")
- `FIREBASE_PROJECT` - Same as GCLOUD_PROJECT
- `FIRESTORE_EMULATOR_HOST` - Emulator host for local dev (e.g., "localhost:8080")
- `GEMINI_API_KEY` - Your Google AI API key
- `JWT_SECRET` - Secret for JWT token signing

**Note:** In Cloud Functions v2, `GCLOUD_PROJECT` and `FIREBASE_PROJECT` are automatically provided. The `.env` file is only needed for local development with Genkit UI.

### Available Scripts

**`run-genkit-dev.sh`** - Development mode with hot reload
```bash
pnpm genkit:dev
```
Starts Genkit with TypeScript watch mode for live code updates.

**`run-genkit-build.sh`** - Production build mode
```bash
pnpm genkit:dev:build
```
Compiles TypeScript first, then starts Genkit with the built JS files.

**`run-genkit-open.sh`** - UI only mode
```bash
pnpm genkit:open
```
Opens Genkit UI without emulators (useful for testing against production).
