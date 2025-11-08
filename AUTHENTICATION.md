# Authentication Flow Documentation

## Overview

This document explains the complete authentication and authorization flow in the FlipFeeds application, from user login to secure Cloud Function execution.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: User Sign-In                                                │
└─────────────────────────────────────────────────────────────────────┘
    │
    │  User enters email/password
    │  in Login Screen
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ app/(auth)/login.tsx                                                │
│                                                                      │
│  await signIn(email, password)                                      │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ contexts/AuthContext.tsx                                            │
│                                                                      │
│  await auth().signInWithEmailAndPassword(email, password)           │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Firebase Authentication Service                                     │
│                                                                      │
│  1. Validates credentials                                           │
│  2. Creates authenticated session                                   │
│  3. Generates ID Token (JWT)                                        │
│  4. Returns User object                                             │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ ID Token (JWT) stored in client
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: Auth State Change                                          │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ contexts/AuthContext.tsx                                            │
│                                                                      │
│  auth().onAuthStateChanged((user) => {                              │
│    setUser(user)  // Update global state                            │
│  })                                                                  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ app/_layout.tsx (Root Layout)                                       │
│                                                                      │
│  const { user } = useAuth()                                         │
│                                                                      │
│  if (user) {                                                        │
│    → Navigate to (tabs)                                             │
│  } else {                                                           │
│    → Navigate to (auth)                                             │
│  }                                                                   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ User is now on Dashboard
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: Secure API Call                                            │
└─────────────────────────────────────────────────────────────────────┘
    │
    │  User taps "Get My Daily Tip"
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ app/(tabs)/index.tsx                                                │
│                                                                      │
│  const result = await functions()                                   │
│    .httpsCallable('getDailyTipTool')()                              │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ Firebase SDK automatically:
                            │ 1. Gets current user's ID token
                            │ 2. Includes it in request headers
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ HTTPS Request to Cloud Function                                     │
│                                                                      │
│  POST /getDailyTipTool                                              │
│  Headers:                                                           │
│    Authorization: Bearer <ID_TOKEN>                                 │
│    Content-Type: application/json                                   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: Token Validation (Server-Side)                             │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ functions/src/index.ts                                              │
│                                                                      │
│  export const getDailyTipTool = functions.https.onCall(             │
│    async (data, context) => {                                       │
│                                                                      │
│      // Firebase automatically validates token                      │
│      // and populates context.auth                                  │
│                                                                      │
│      if (!context.auth) {                                           │
│        throw new HttpsError('unauthenticated', ...)                 │
│      }                                                               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ Token is valid
                            │ User ID extracted: context.auth.uid
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: Fetch User Data                                            │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ functions/src/index.ts                                              │
│                                                                      │
│  const userId = context.auth.uid                                    │
│                                                                      │
│  const userDoc = await admin.firestore()                            │
│    .collection('users')                                             │
│    .doc(userId)                                                     │
│    .get()                                                           │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Firestore Security Rules Check                                      │
│                                                                      │
│  match /users/{userId} {                                            │
│    // Admin SDK bypasses rules, but validates internally            │
│    allow read: if request.auth.uid == userId                        │
│  }                                                                   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ User profile retrieved:
                            │ {
                            │   name: "John",
                            │   fitnessGoal: "Weight Loss",
                            │   dietaryPreference: "Vegan"
                            │ }
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6: Generate AI Prompt                                         │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ functions/src/index.ts                                              │
│                                                                      │
│  const prompt = `You are a fitness coach...                         │
│    Name: ${userProfile.name}                                        │
│    Fitness Goal: ${userProfile.fitnessGoal}                         │
│    Dietary Preference: ${userProfile.dietaryPreference}             │
│    ...`                                                              │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 7: Call Gemini AI                                             │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Vertex AI / Gemini API                                              │
│                                                                      │
│  const result = await generativeModel                               │
│    .generateContentStream(request)                                  │
│                                                                      │
│  Returns:                                                           │
│  "Based on your goal of weight loss and vegan diet,                │
│   start your day with a protein-rich smoothie..."                  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 8: Return Response                                            │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ functions/src/index.ts                                              │
│                                                                      │
│  return {                                                           │
│    tip: tipText.trim(),                                             │
│    timestamp: FieldValue.serverTimestamp()                          │
│  }                                                                   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ HTTPS Response
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ app/(tabs)/index.tsx                                                │
│                                                                      │
│  const data = result.data as { tip?: string }                       │
│  setTip(data.tip)  // Display to user                               │
└─────────────────────────────────────────────────────────────────────┘
```

## ID Token Details

### What is an ID Token?

An ID Token is a JSON Web Token (JWT) that contains:

```json
{
  "iss": "https://securetoken.google.com/PROJECT_ID",
  "aud": "PROJECT_ID",
  "auth_time": 1699999999,
  "user_id": "abc123xyz",
  "sub": "abc123xyz",
  "iat": 1699999999,
  "exp": 1700003599,
  "email": "user@example.com",
  "email_verified": true,
  "firebase": {
    "identities": {
      "email": ["user@example.com"]
    },
    "sign_in_provider": "password"
  }
}
```

### Token Lifecycle

1. **Generation**: Created when user signs in
2. **Expiration**: Valid for 1 hour
3. **Refresh**: Automatically refreshed by Firebase SDK
4. **Validation**: Verified on every Cloud Function call

### How Token Validation Works

```typescript
// Client Side (Automatic)
const result = await functions().httpsCallable('myFunction')();
// SDK gets token: await auth().currentUser.getIdToken()
// SDK includes in header: Authorization: Bearer <token>

// Server Side (Automatic for onCall functions)
export const myFunction = functions.https.onCall(async (data, context) => {
  // Firebase has already:
  // 1. Extracted token from Authorization header
  // 2. Verified token signature
  // 3. Checked token expiration
  // 4. Validated issuer and audience
  // 5. Populated context.auth with decoded claims
  
  const userId = context.auth.uid; // ✅ Verified user ID
});
```

## Security Guarantees

### What the ID Token Proves

✅ **User Identity**: The token confirms WHO the user is  
✅ **Authentication**: The user successfully logged in  
✅ **Authorization**: The user is allowed to make this request  
✅ **Integrity**: The token hasn't been tampered with  
✅ **Freshness**: The token is not expired  

### What Cannot Be Forged

❌ User cannot fake their `uid`  
❌ User cannot access another user's data  
❌ Expired tokens are rejected  
❌ Tokens from other Firebase projects are rejected  
❌ Modified tokens are detected and rejected  

## Common Attack Scenarios (Prevented)

### Scenario 1: User tries to access another user's data

```typescript
// ❌ CANNOT HAPPEN
// User A tries to get User B's profile

// Client (User A's app):
functions().httpsCallable('getUserProfile')({ userId: 'user-b-id' });

// Server:
export const getUserProfile = functions.https.onCall(async (data, context) => {
  const requestedUserId = data.userId;
  const authenticatedUserId = context.auth.uid; // Always User A's ID
  
  // ✅ SECURITY CHECK
  if (requestedUserId !== authenticatedUserId) {
    throw new HttpsError('permission-denied', 'Access denied');
  }
});
```

### Scenario 2: Unauthenticated user tries to call function

```typescript
// ❌ CANNOT HAPPEN
// curl -X POST https://.../getDailyTipTool
// No Authorization header = No context.auth

// Server:
if (!context.auth) {
  throw new HttpsError('unauthenticated', 'Must be signed in');
}
```

### Scenario 3: Expired token

```typescript
// ❌ AUTOMATICALLY PREVENTED
// Firebase SDK refreshes tokens automatically
// If refresh fails (user signed out), request fails
// Server rejects expired tokens before function executes
```

## Best Practices

### 1. Always Check `context.auth`

```typescript
export const myFunction = functions.https.onCall(async (data, context) => {
  // ✅ DO THIS FIRST
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '...');
  }
  
  // Now safe to use context.auth.uid
});
```

### 2. Use User ID from Token, Not Request Data

```typescript
// ❌ WRONG - User could send fake ID
const userId = data.userId;

// ✅ CORRECT - ID from verified token
const userId = context.auth.uid;
```

### 3. Double-Check Firestore Rules

```javascript
// Even though functions use Admin SDK (bypasses rules),
// always have rules as defense-in-depth

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

### 4. Validate Input Data

```typescript
export const myFunction = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new HttpsError('unauthenticated', '...');
  
  // ✅ Validate any client-provided data
  if (!data.fitnessGoal || typeof data.fitnessGoal !== 'string') {
    throw new HttpsError('invalid-argument', 'Invalid fitness goal');
  }
});
```

## Testing Authentication Flow

### Test 1: Unauthenticated Request

```bash
# Should fail with "unauthenticated"
curl -X POST https://REGION-PROJECT.cloudfunctions.net/getDailyTipTool
```

### Test 2: Valid Authenticated Request

```typescript
// In your app
const user = auth().currentUser;
console.log('User:', user.uid);

const result = await functions().httpsCallable('getDailyTipTool')();
console.log('Result:', result.data);
```

### Test 3: View Token

```typescript
// See what's in your ID token
const token = await auth().currentUser?.getIdToken();
console.log('Token:', token);

// Decode at jwt.io to see claims
```

## Debugging

### Enable Logging

```typescript
// Client side
auth().settings.logLevel = 'verbose';

// Server side (functions/src/index.ts)
console.log('Auth context:', context.auth);
console.log('User ID:', context.auth?.uid);
```

### Check Token in Firebase Console

1. Firebase Console > Authentication
2. Find the user
3. View "User UID" - this matches `context.auth.uid`

### Monitor Function Calls

```bash
firebase functions:log --only getDailyTipTool
```

## Summary

The authentication flow ensures:

1. ✅ Users must sign in to access protected resources
2. ✅ Cloud Functions verify user identity on every request
3. ✅ Users can only access their own data
4. ✅ AI responses are personalized and secure
5. ✅ All communication is encrypted (HTTPS)

This creates a **bulletproof security layer** for your AI-powered mobile application.
