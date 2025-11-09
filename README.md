# FlipFeeds - The Anti-Social Social App

**"Social feeds are noise. FlipFeeds is a ping."**

FlipFeeds reimagines social interaction with AI-powered micro-content. No feeds, no scrolling - just a friends list and a **FLIP** button.

## Core Concept

- Friends list with **FLIP** buttons
- Tap FLIP → Cloud Function generates AI content via Gemini
- Recipient gets push notification with quirky message
- Real-time flip streaks 🔥

## Architecture

```
Mobile App (React Native + Expo)
    ↓ FLIP button
Cloud Function: sendFlip
    1. Validate Auth Token
    2. Verify App Check
    3. Fetch Remote Config (AI prompt)
    4. Call Vertex AI (Gemini)
    5. Update Realtime Database (streak)
    6. Send FCM notification
    7. Log Analytics event
    ↓
Firebase Services (All 15+)
```

## Tech Stack

**Frontend**: React Native, Expo 54, expo-router, NativeWind v5
**Backend**: Firebase (serverless)
**Firebase Services**: Auth, Firestore, RTDB, Functions, Storage, FCM, App Check, Analytics, Performance, Crashlytics, Remote Config, In-App Messaging, ML Kit, App Distribution, Vertex AI

## Setup

### 1. Firebase Project
```bash
# Create project at console.firebase.google.com
# Enable all Firebase services
# Download config files:
#   - android/app/google-services.json
#   - ios/flipfeedsapp/GoogleService-Info.plist
```

### 2. Install Dependencies
```bash
npm install
cd ios && pod install && cd ..
```

### 3. Deploy Cloud Functions
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 4. Remote Config
Set `flip_prompt_template`:
```
Generate a single, short, SFW piece of micro-content. It could be a weird fact, a 1-sentence joke, or a bizarre compliment. Be quirky and fun. Keep it under 100 characters.
```

### 5. Deploy Security Rules
```bash
firebase deploy --only firestore:rules,database
```

### 6. Run App
```bash
npm start
npm run ios    # or
npm run android
```

## Data Schema

### Firestore
- `users/{uid}`: displayName, email, photoURL, fcmToken
- `friendships/{id}`: users[], status, requesterId

### Realtime Database
- `flip_streaks/{uid1_uid2}`: count, lastFlipTimestamp

## Key Features

**Friends Screen**: List with FLIP buttons, real-time streaks
**Profile Screen**: Image upload with ML Kit labeling demo
**Add Friend Modal**: Search by displayName
**sendFlip Function**: Secure tool server with 7-step process

## Security Pattern

```typescript
// Client: Auto-attaches Auth ID Token
const sendFlip = functions().httpsCallable('sendFlip');
await sendFlip({ recipientUid });

// Server: Validates auth and executes privileged operations
export const sendFlip = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated');
    // ... secure operations
});
```

## Project Structure

```
app/
  ├── (auth)/login.tsx       # Email/Password + Google Sign-In
  ├── (tabs)/
  │   ├── index.tsx          # Friends screen
  │   └── profile.tsx        # Profile with ML Kit
  └── modal.tsx              # Add friend
contexts/AuthContext.tsx     # Auth state management
lib/firebaseConfig.ts        # Firebase initialization
functions/src/sendFlip.ts    # Main Cloud Function
```

## Testing

```bash
# Start emulators
npm run emulators

# Emulator UI: http://localhost:4000
```

## Distribution

```bash
# iOS
npm run ios:distribute

# Android
npm run android:distribute
```

## Live Demo Flow

1. Two devices logged in as different users
2. User A taps FLIP on User B
3. Function validates auth, calls Gemini, updates streak, sends FCM
4. User B gets notification, streak updates live 🔥
5. User B sees AI-generated content

## Resources

- [Expo Docs](https://docs.expo.dev/)
- [Firebase Docs](https://firebase.google.com/docs)
- [React Native Firebase](https://rnfirebase.io/)
- [NativeWind](https://www.nativewind.dev/)

---

Built with React Native, Expo, and every Firebase service 🔥
