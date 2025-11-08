# Quick Start Guide - FlipFeeds

Get the app running in 15 minutes or less!

## Prerequisites Checklist

Before you begin, make sure you have:

- [ ] Node.js 18 or higher installed
- [ ] npm or yarn package manager
- [ ] Git
- [ ] A Google/Firebase account
- [ ] iOS Simulator (Mac) or Android Emulator installed

## Step 1: Clone the Repository (1 min)

```bash
git clone https://github.com/codercatdev/flipfeeds-app.git
cd flipfeeds-app
```

## Step 2: Install Dependencies (2 min)

```bash
npm install
```

## Step 3: Firebase Project Setup (5 min)

### 3.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it `flipfeeds-app` (or your preference)
4. **Disable** Google Analytics (optional, not needed for this demo)
5. Click "Create project"

### 3.2 Enable Authentication

1. In Firebase Console, click "Authentication"
2. Click "Get started"
3. Click "Sign-in method" tab
4. Click "Google"
5. Enable the toggle
6. Click "Save"
7. **Important**: Copy the "Web Client ID" - you'll need it in Step 4

### 3.3 Create Firestore Database

1. In Firebase Console, click "Firestore Database"
2. Click "Create database"
3. Select "Start in production mode"
4. Choose a location (e.g., `us-central1`)
5. Click "Enable"

### 3.4 Register Mobile Apps

**For iOS:**

1. Firebase Console → Project Settings (gear icon)
2. Click "Add app" → iOS
3. Bundle ID: `com.codercatdev.flipfeedsapp`
4. App nickname: `FlipFeeds iOS`
5. Click "Register app"
6. Download `GoogleService-Info.plist`
7. Move it to: `ios/flipfeedsapp/GoogleService-Info.plist`
8. Click "Next" → "Continue to console"

**For Android:**

1. Firebase Console → Project Settings
2. Click "Add app" → Android
3. Package name: `com.codercatdev.flipfeedsapp`
4. App nickname: `FlipFeeds Android`
5. Click "Register app"
6. Download `google-services.json`
7. Move it to: `android/app/google-services.json`
8. Click "Next" → "Continue to console"

## Step 4: Configure Google Sign-In (3 min)

### 4.1 Get Web Client ID

1. Firebase Console → Project Settings
2. Scroll down to "Your apps" section
3. Find your iOS or Android app
4. Copy the **Web Client ID** (ends with `.apps.googleusercontent.com`)

### 4.2 Update AuthContext

Edit `contexts/AuthContext.tsx` line 22 and replace the placeholder:

```typescript
GoogleSignin.configure({
  webClientId: 'YOUR-WEB-CLIENT-ID.apps.googleusercontent.com', // ← Paste here
});
```

**Need help?** See detailed instructions in [GOOGLE_SIGNIN_SETUP.md](./GOOGLE_SIGNIN_SETUP.md)

### 4.3 Update Firebase Config (Optional)

The app works with the default config, but you can update `lib/firebaseConfig.ts` if needed:

1. Firebase Console → Project Settings
2. Scroll down to "Your apps"
3. Click "Web" or "Add app" → Web
4. Copy the `firebaseConfig` object
5. Replace in `lib/firebaseConfig.ts`

## Step 5: Deploy Firestore Rules (1 min)

```bash
firebase login
firebase init firestore
# Select "Use an existing project"
# Choose your project
# Accept default file names

firebase deploy --only firestore:rules
```

## Step 6: Set Up Cloud Functions (5 min)

### 6.1 Enable Vertex AI

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Search for "Vertex AI API"
4. Click "Enable"
5. **Enable billing** (required for Vertex AI)
   - Click "Billing" in left menu
   - Link a billing account

### 6.2 Update Project ID

Edit `functions/src/index.ts` line 10:

```typescript
const vertexAI = new VertexAI({
  project: 'YOUR-ACTUAL-PROJECT-ID', // ← Change this
  location: 'us-central1',
});
```

Find your project ID:
```bash
firebase projects:list
```

### 6.3 Install Function Dependencies

```bash
cd functions
npm install
```

### 6.4 Deploy Functions

```bash
npm run deploy

# Or from root directory:
cd ..
firebase deploy --only functions
```

Wait for deployment to complete (2-3 minutes).

## Step 7: Run the App (2 min)

### Option A: iOS (Mac only)

```bash
npm run ios
```

### Option B: Android

```bash
npm run android
```

### Option C: Start Dev Server

```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator

## Step 8: Test the App (2 min)

### 8.1 Sign In with Google

1. App opens to login screen
2. Tap "Sign in with Google"
3. Select your Google account
4. Grant permissions
5. Automatically navigates to Dashboard

### 8.2 Set Up Profile

1. Tap "Profile" tab at bottom
2. Name: Enter your name
3. Fitness Goal: Select `Weight Loss` (or your preference)
4. Dietary Preference: Select `Vegan` (or your preference)
5. Tap "Save Profile"

### 8.3 Get AI Tip

1. Tap "Dashboard" tab
2. Tap "Get My Daily Tip"
3. Wait 3-5 seconds
4. See personalized AI tip! 🎉

## Troubleshooting

### "Developer Error" when signing in

**Solution:** Google Sign-In needs proper configuration.
1. See [GOOGLE_SIGNIN_SETUP.md](./GOOGLE_SIGNIN_SETUP.md) for complete setup
2. Verify Web Client ID in `contexts/AuthContext.tsx`
3. For Android: Add SHA-1 fingerprint to Firebase Console
4. For iOS: Ensure GoogleService-Info.plist is present

### "Firebase app not initialized"

**Solution:**
```bash
# Ensure GoogleService files are in correct locations
ls ios/flipfeedsapp/GoogleService-Info.plist
ls android/app/google-services.json

# Rebuild
npm run prebuild-clean
```

### "Function not found"

**Solution:**
```bash
# Check function deployed successfully
firebase functions:list

# Redeploy if needed
cd functions
npm run deploy
```

### "Unauthenticated" error

**Solution:**
- Make sure you're signed in with Google
- Check Firebase Console → Authentication → Users
- Try signing out and back in

### Build errors on iOS

**Solution:**
```bash
cd ios
pod install
cd ..
npm run ios
```

### Build errors on Android

**Solution:**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

## Verify Everything Works

✅ **Authentication**
- Can sign up new user
- Can sign in existing user
- Can sign out

✅ **Profile**
- Can update name
- Can select fitness goal
- Can select dietary preference
- Changes save to Firestore

✅ **AI Tips**
- Button triggers function
- Loading state appears
- Tip is personalized
- Tip displays correctly

✅ **Firebase Backend**
- Check Firebase Console → Authentication → Users (your test user appears)
- Check Firestore → users collection (profile data saved)
- Check Functions → Logs (function executions logged)

## Next Steps

Now that you have it running:

1. **Customize the UI**: Edit screens in `app/` directory
2. **Add more fields**: Expand the user profile
3. **Change AI prompt**: Modify `functions/src/index.ts`
4. **Add more tabs**: Create new screens in `app/(tabs)/`
5. **Deploy to device**: Build APK/IPA for testing on real devices

## Common Commands

```bash
# Start dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Lint/Format code
npm run lint
npm run format

# Deploy functions
cd functions
npm run deploy

# View function logs
firebase functions:log

# Start emulators (local testing)
firebase emulators:start
```

## Getting Help

- **Full Documentation**: See `README.md`
- **Authentication Details**: See `AUTHENTICATION.md`
- **Deployment Guide**: See `DEPLOYMENT.md`
- **Presentation Script**: See `PRESENTATION.md`

## Success! 🎉

You now have a fully functional, secure, AI-powered mobile app running on your machine!

**What you built:**
- ✅ Secure authentication with Firebase
- ✅ Protected Cloud Functions
- ✅ Personalized AI recommendations
- ✅ Production-ready architecture

**Time to complete**: ~15 minutes

---

**Need help?** Check the documentation files or open an issue on GitHub.
