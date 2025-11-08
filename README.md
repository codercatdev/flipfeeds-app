# FlipFeeds - Secure AI-Powered Fitness & Nutrition App

A complete demonstration of securely connecting a mobile application to AI services using Firebase Authentication and Google Cloud Functions. This project showcases how to build a serverless "tool server" that authenticates users, fetches personalized data, and generates AI-powered recommendations.

## 🎯 Project Overview

FlipFeeds is a React Native (Expo) mobile application that provides users with personalized fitness and nutrition tips powered by Google's Gemini AI. The architecture demonstrates best practices for:

- **Secure Authentication**: Firebase Auth with ID token validation
- **Protected API Routes**: Cloud Functions that verify user identity
- **Personalized AI**: Context-aware recommendations based on user profiles
- **Machine-to-Machine (M2M) Security**: Bulletproof token validation flow

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Mobile App (Expo)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Login      │  │  Dashboard   │  │   Profile    │         │
│  │   Screen     │  │   Screen     │  │   Screen     │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                  │
│         └─────────────────┼──────────────────┘                  │
│                           │                                     │
│                  Firebase Client SDK                            │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                   Firebase ID Token
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    Firebase Backend                             │
│                                                                  │
│  ┌────────────────────────────────────────────────┐            │
│  │        Cloud Function: getDailyTipTool         │            │
│  │                                                 │            │
│  │  1. Validate ID Token ──────────┐             │            │
│  │  2. Extract User ID             │             │            │
│  │  3. Fetch User Profile ─────────┼────┐        │            │
│  │  4. Generate AI Prompt          │    │        │            │
│  │  5. Call Gemini API ────────────┼────┼───┐   │            │
│  │  6. Return Personalized Tip     │    │   │   │            │
│  └──────────────────────────────────┼────┼───┼───┘            │
│                                     │    │   │                 │
│  ┌──────────────────────────────────▼──┐ │   │                │
│  │      Firebase Authentication        │ │   │                │
│  │    (Token Validation & User Mgmt)   │ │   │                │
│  └─────────────────────────────────────┘ │   │                │
│                                           │   │                │
│  ┌────────────────────────────────────────▼─┐ │                │
│  │         Cloud Firestore                  │ │                │
│  │                                           │ │                │
│  │  users/{userId}:                          │ │                │
│  │    - name: string                         │ │                │
│  │    - fitnessGoal: string                  │ │                │
│  │    - dietaryPreference: string            │ │                │
│  └───────────────────────────────────────────┘ │                │
│                                                 │                │
│  ┌──────────────────────────────────────────────▼──┐           │
│  │         Vertex AI / Gemini API                  │           │
│  │      (AI-Powered Content Generation)            │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 🔐 Security Flow

1. **User Authentication**: User signs in via Firebase Auth
2. **Token Generation**: Firebase generates a secure ID token
3. **Authenticated Request**: Client includes token in Cloud Function call
4. **Token Validation**: Cloud Function validates token using Firebase Admin SDK
5. **User Identification**: Extract verified user ID from token
6. **Data Retrieval**: Fetch user-specific data from Firestore
7. **AI Generation**: Generate personalized content based on user profile
8. **Secure Response**: Return data only to authenticated user

## 📱 Application Structure

### File-Based Routing (expo-router)

```
app/
├── _layout.tsx              # Root layout: Auth gateway & provider wrapper
├── (auth)/
│   ├── _layout.tsx          # Auth stack layout
│   └── login.tsx            # Login/Signup screen
└── (tabs)/
    ├── _layout.tsx          # Tab navigator (Dashboard & Profile)
    ├── index.tsx            # Dashboard: Get AI tips
    └── profile.tsx          # Profile: Manage preferences
```

### Key Features by Screen

**Login Screen** (`app/(auth)/login.tsx`)
- Google Sign-In authentication (one-tap login)
- Automatic profile initialization on first sign-in
- See [GOOGLE_SIGNIN_SETUP.md](./GOOGLE_SIGNIN_SETUP.md) for configuration

**Dashboard** (`app/(tabs)/index.tsx`)
- "Get My Daily Tip" button
- Calls `getDailyTipTool` Cloud Function
- Displays AI-generated personalized advice
- Loading states and error handling

**Profile** (`app/(tabs)/profile.tsx`)
- Edit user name
- Select fitness goal (Weight Loss, Muscle Gain, etc.)
- Choose dietary preference (Vegetarian, Vegan, Keto, etc.)
- Sign out functionality
- Auto-save to Firestore

**Root Layout** (`app/_layout.tsx`)
- Wraps app in `AuthProvider`
- Monitors auth state changes
- Redirects to login if not authenticated
- Shows tabs only for authenticated users

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Expo CLI (`npm install -g expo-cli`)
- Google Cloud Project with billing enabled
- iOS Simulator (Mac) or Android Emulator

### Part 1: Firebase Project Setup

#### 1.1 Create Firebase Project

```bash
# Login to Firebase
firebase login

# Create new project (or use existing)
# Visit https://console.firebase.google.com/
# Click "Add project" and follow the wizard
```

#### 1.2 Enable Services

In the Firebase Console:

1. **Authentication**
   - Go to Authentication > Sign-in method
   - Enable "Google" provider (see [GOOGLE_SIGNIN_SETUP.md](./GOOGLE_SIGNIN_SETUP.md))
   
2. **Firestore Database**
   - Go to Firestore Database
   - Click "Create database"
   - Start in production mode
   - Choose a location (e.g., us-central1)

3. **Cloud Functions**
   - Already enabled with Firebase

4. **Vertex AI (for Gemini)**
   - Go to Google Cloud Console
   - Enable Vertex AI API
   - Ensure billing is enabled

#### 1.3 Register Mobile Apps

**For iOS:**
```bash
# In Firebase Console:
# Project Settings > Add app > iOS
# Bundle ID: com.codercatdev.flipfeedsapp (or your own)
# Download GoogleService-Info.plist
# Place it in the ios/flipfeedsapp/ directory
```

**For Android:**
```bash
# In Firebase Console:
# Project Settings > Add app > Android
# Package name: com.codercatdev.flipfeedsapp (or your own)
# Download google-services.json
# Place it in the android/app/ directory
```

### Part 2: Cloud Functions Setup

#### 2.1 Initialize Firebase in Project

```bash
cd flipfeeds-app

# If not already initialized
firebase init

# Select:
# - Functions (TypeScript)
# - Firestore
# - Use existing project
# - Accept defaults
```

#### 2.2 Install Function Dependencies

```bash
cd functions
npm install
```

#### 2.3 Update Project ID

Edit `functions/src/index.ts` and replace the project ID:

```typescript
const vertexAI = new VertexAI({
  project: 'your-actual-project-id', // Replace this
  location: 'us-central1',
});
```

#### 2.4 Build and Test Locally

```bash
# Build functions
npm run build

# Start emulators
firebase emulators:start
```

#### 2.5 Deploy to Firebase

```bash
# From functions directory
cd functions
npm run deploy

# Or deploy from root
firebase deploy --only functions
```

### Part 3: Mobile App Setup

#### 3.1 Install Dependencies

```bash
cd flipfeeds-app
npm install
```

#### 3.2 Configure Firebase

The Firebase configuration files should already be in place:
- `ios/flipfeedsapp/GoogleService-Info.plist`
- `android/app/google-services.json`

Update `lib/firebaseConfig.ts` with your Firebase config (for web):

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

#### 3.3 Prebuild Native Projects

```bash
# Clean prebuild
npm run prebuild-clean

# This generates ios/ and android/ directories with Firebase config
```

#### 3.4 Run the App

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

**Development Server:**
```bash
npm start
```

## 🧪 Testing the Application

### 1. Create an Account

1. Launch the app
2. Tap "Don't have an account? Sign Up"
3. Enter email and password
4. Tap "Sign Up"
5. You'll be automatically logged in

### 2. Set Up Profile

1. Navigate to "Profile" tab
2. Enter your name
3. Select a fitness goal
4. Choose dietary preference
5. Tap "Save Profile"

### 3. Get AI Recommendation

1. Navigate to "Dashboard" tab
2. Tap "Get My Daily Tip"
3. Wait for AI to generate personalized advice
4. View your custom recommendation

### 4. Verify Security

Try these tests to verify authentication:

```bash
# In Firebase Console > Functions > Logs
# You should see successful function executions

# Try calling function without auth (should fail):
curl -X POST https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/getDailyTipTool \
  -H "Content-Type: application/json"
# Response: "Unauthenticated"
```

## 🔍 Code Deep Dive

### Authentication Context

The `AuthContext` (`contexts/AuthContext.tsx`) provides:

- Global auth state management
- Sign in/up/out methods
- Real-time auth state listener
- Automatic profile creation on signup

```typescript
const { user, loading, signIn, signUp, signOut } = useAuth();
```

### Protected Routes

The root layout (`app/_layout.tsx`) acts as an authentication gateway:

```typescript
{user ? (
  <Stack.Screen name="(tabs)" />
) : (
  <Stack.Screen name="(auth)" />
)}
```

### Cloud Function Security

The `getDailyTipTool` function demonstrates secure patterns:

```typescript
export const getDailyTipTool = functions.https.onCall(async (data, context) => {
  // Auto-validates ID token
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '...');
  }
  
  const userId = context.auth.uid; // Verified user ID
  
  // Fetch user-specific data
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(userId)
    .get();
    
  // Generate personalized AI content
  // ...
});
```

### Calling Cloud Functions from Client

```typescript
const result = await functions().httpsCallable('getDailyTipTool')();
// Firebase SDK automatically includes ID token
```

## 📊 Data Model

### Firestore Collection: `users`

```typescript
{
  // Document ID: {userId} (Firebase Auth UID)
  name: string,                    // User's display name
  fitnessGoal: string,             // e.g., "Weight Loss", "Muscle Gain"
  dietaryPreference: string        // e.g., "Vegan", "Keto"
}
```

### Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can only access their own document
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
  }
}
```

## 🎓 Tutorial: Building This from Scratch

### Step 1: Set Up Expo Project with Router

```bash
npx create-expo-app@latest flipfeeds-app --template tabs@sdk-54
cd flipfeeds-app
```

### Step 2: Install Firebase Dependencies

```bash
npm install @react-native-firebase/app \
            @react-native-firebase/auth \
            @react-native-firebase/firestore \
            @react-native-firebase/functions \
            @react-native-async-storage/async-storage
```

### Step 3: Create Auth Context

Create `contexts/AuthContext.tsx` with authentication logic.

### Step 4: Update Root Layout

Modify `app/_layout.tsx` to:
- Wrap app in `AuthProvider`
- Check auth state
- Redirect based on authentication

### Step 5: Create Auth Screens

Create `app/(auth)/login.tsx` for sign in/up.

### Step 6: Build Protected Screens

Update `app/(tabs)/index.tsx` and create `app/(tabs)/profile.tsx`.

### Step 7: Set Up Cloud Functions

```bash
firebase init functions
cd functions
npm install firebase-admin firebase-functions @google-cloud/vertexai
```

### Step 8: Implement Secure Function

Create `functions/src/index.ts` with token validation and AI integration.

### Step 9: Deploy and Test

```bash
firebase deploy --only functions
npm run ios # or android
```

## 🎤 Presentation Talking Points

### Introduction (2 minutes)
- The AI opportunity for mobile apps
- The security challenge: protecting user data
- Solution: Secure tool server architecture

### Architecture Overview (3 minutes)
- Mobile app sends authenticated requests
- Cloud Function validates tokens
- Firestore stores user preferences
- Gemini AI generates personalized content

### Security Deep Dive (5 minutes)
- Firebase ID tokens: What they are
- How token validation works
- Why this prevents unauthorized access
- Demo: Attempting to call function without auth

### Live Demo (5 minutes)
1. Sign up new user
2. Set profile preferences
3. Request AI tip
4. Show Firebase Console logs
5. Explain token flow

### Code Walkthrough (10 minutes)
- Auth context and protected routes
- Cloud Function implementation
- Token validation in detail
- AI prompt engineering

### Q&A (5 minutes)

## 🛠️ Troubleshooting

### "User must be authenticated" Error

**Cause**: Token not being sent or invalid.

**Solution**: 
- Ensure user is signed in: `console.log(user)`
- Check function name matches
- Verify Firebase SDK initialization

### "User profile not found" Error

**Cause**: User document doesn't exist in Firestore.

**Solution**:
- Check Firestore Console
- Verify signup creates user document
- Manually create document if needed

### Cloud Function Not Deploying

**Solution**:
```bash
cd functions
npm run build
# Check for TypeScript errors
firebase deploy --only functions --debug
```

### iOS Build Errors

**Solution**:
```bash
cd ios
pod install
cd ..
npm run prebuild-clean
```

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [Vertex AI Gemini API](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)
- [expo-router Documentation](https://docs.expo.dev/router/introduction/)

## 🤝 Contributing

This is a demonstration project for educational purposes. Feel free to fork and customize for your own presentations!

## 📄 License

MIT License - feel free to use this in your own talks and workshops.

## 🎯 Key Takeaways

1. **Security First**: Always validate authentication tokens on the backend
2. **User Context**: Fetch personalized data after verifying user identity
3. **Serverless Scale**: Cloud Functions handle authentication and scaling
4. **AI Integration**: Vertex AI/Gemini provides powerful content generation
5. **Clean Architecture**: expo-router enables clear separation of auth and app flows

---

**Built with ❤️ for secure, AI-powered mobile applications**
