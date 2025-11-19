# Authentication Blocking Functions

This directory contains Firebase Authentication blocking functions that enforce access control for the FlipFeeds app.

## Overview

The blocking functions execute **synchronously** during the authentication flow to prevent unauthorized users from creating accounts or signing in. Only email addresses explicitly added to the `allowedUsers` Firestore collection can authenticate.

## How It Works

### Blocking Points

Two blocking functions are deployed:

1. **`beforeUserCreated`** - Runs before a new user account is created
2. **`beforeUserSignedIn`** - Runs before an existing user signs in

Both functions:
- Query the `allowedUsers` collection in Firestore
- Check if the user's email exists as a document ID
- Allow or deny the authentication operation
- Log all attempts for security auditing

### Firestore Schema

The `allowedUsers` collection uses email addresses as document IDs:

```
allowedUsers/
  ├── user1@example.com
  │   ├── email: "user1@example.com"
  │   ├── addedAt: Timestamp
  │   └── addedBy: "admin-script"
  └── user2@example.com
      ├── email: "user2@example.com"
      ├── addedAt: Timestamp
      └── addedBy: "admin-script"
```

## Setup

### 1. Deploy the Functions

Build and deploy the blocking functions:

```bash
cd functions
pnpm build
firebase deploy --only functions:beforeUserCreated,functions:beforeUserSignedIn
```

### 2. Configure Firebase Console

After deploying, you need to enable the blocking functions in the Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication** → **Settings** → **Manage blocking functions**
4. Enable the deployed blocking functions

> **Note:** Blocking functions must be explicitly enabled in the Firebase Console to take effect.

### 3. Add Allowed Users

Use the management script to add your email addresses:

```bash
# Add a user
node scripts/manage-allowed-users.js add your.email@example.com

# Add multiple users
node scripts/manage-allowed-users.js add user1@example.com
node scripts/manage-allowed-users.js add user2@example.com
```

## Managing Allowed Users

### Add a User

```bash
node scripts/manage-allowed-users.js add email@example.com
```

### Remove a User

```bash
node scripts/manage-allowed-users.js remove email@example.com
```

### List All Allowed Users

```bash
node scripts/manage-allowed-users.js list
```

### Using Emulator (Development)

To test with the Firestore emulator:

```bash
export FIRESTORE_EMULATOR_HOST="localhost:8080"
node scripts/manage-allowed-users.js add test@example.com
```

## Testing

### Test Account Creation

1. Add your email to the allowed list
2. Try to create an account with that email - should succeed
3. Try to create an account with a different email - should fail

### Test Sign-In

1. Ensure an account exists (created when email was allowed)
2. Remove the email from the allowed list
3. Try to sign in - should fail with permission denied

### Expected Error Message

When a blocked user tries to authenticate:

```
Error: Your email address is not authorized to create an account. Please contact support.
```

or

```
Error: Your email address is not authorized to sign in. Please contact support.
```

## Security Considerations

### Fail-Closed Behavior

If the Firestore check fails (network issue, permission error, etc.), the blocking functions **deny access** by default. This ensures security is maintained even during outages.

### Logging

All authentication attempts are logged with:
- Email address
- Success/failure status
- Timestamp

View logs:

```bash
firebase functions:log --only beforeUserCreated,beforeUserSignedIn
```

### Production vs Development

- **Development:** Use emulator and add test emails freely
- **Production:** Carefully manage allowed users and monitor logs

## Firestore Security Rules

Ensure that the `allowedUsers` collection has appropriate security rules in `firestore.rules`:

```javascript
match /allowedUsers/{email} {
  // Only admins can read/write
  allow read, write: if request.auth != null && 
    request.auth.token.admin == true;
}
```

## Quick Start for Initial Setup

```bash
# 1. Build and deploy
cd functions
pnpm build
firebase deploy --only functions:beforeUserCreated,functions:beforeUserSignedIn

# 2. Enable in Firebase Console (manual step)
# Go to Authentication → Settings → Blocking functions

# 3. Add your emails
node scripts/manage-allowed-users.js add your.email@example.com
node scripts/manage-allowed-users.js add backup.email@example.com

# 4. Verify
node scripts/manage-allowed-users.js list
```

## Troubleshooting

### Function Not Blocking Users

- Check that functions are deployed: `firebase functions:list`
- Verify they're enabled in Firebase Console
- Check function logs for errors

### Can't Add Users via Script

- Ensure Firebase Admin is initialized correctly
- Check Firestore security rules
- Verify your Firebase credentials

### Performance Concerns

Each authentication requires a Firestore read. For high-traffic apps, consider:
- Using Firestore caching
- Implementing a allowlist check in custom claims
- Using Firebase Extensions for more complex logic

## Related Files

- **Implementation:** `functions/src/functions/authBlocking.ts`
- **Management Script:** `functions/scripts/manage-allowed-users.js`
- **Main Export:** `functions/src/index.ts`
