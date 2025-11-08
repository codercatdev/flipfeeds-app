# FlipFeeds Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                         CLIENT LAYER (React Native + Expo)                 │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                     Authentication Flow                            │   │
│  │                                                                     │   │
│  │  app/(auth)/                                                       │   │
│  │  ┌──────────────────┐                                              │   │
│  │  │  login.tsx       │  ← Entry point for unauthenticated users    │   │
│  │  │                  │                                              │   │
│  │  │  • Email/Pass    │                                              │   │
│  │  │  • Sign In/Up    │                                              │   │
│  │  │  • Error handling│                                              │   │
│  │  └──────────────────┘                                              │   │
│  │          │                                                          │   │
│  │          ▼                                                          │   │
│  │  ┌──────────────────────────────────────────────┐                 │   │
│  │  │    contexts/AuthContext.tsx                  │                 │   │
│  │  │                                               │                 │   │
│  │  │  • Global auth state                         │                 │   │
│  │  │  • signIn() / signUp() / signOut()          │                 │   │
│  │  │  • Real-time auth listener                   │                 │   │
│  │  │  • Auto profile creation                     │                 │   │
│  │  └───────────────────┬──────────────────────────┘                 │   │
│  │                      │                                             │   │
│  └──────────────────────┼─────────────────────────────────────────────┘   │
│                         │                                                  │
│                         ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      Protected App Flow                             │  │
│  │                                                                      │  │
│  │  app/_layout.tsx  ← Root Layout (Auth Gateway)                      │  │
│  │  ┌────────────────────────────────────────────┐                    │  │
│  │  │  if (user) {                                │                    │  │
│  │  │    → Show (tabs)                            │                    │  │
│  │  │  } else {                                   │                    │  │
│  │  │    → Show (auth)                            │                    │  │
│  │  │  }                                          │                    │  │
│  │  └────────────────────────────────────────────┘                    │  │
│  │                      │                                               │  │
│  │                      ▼                                               │  │
│  │  app/(tabs)/                                                         │  │
│  │  ┌───────────────────────┐  ┌────────────────────────┐             │  │
│  │  │  index.tsx            │  │  profile.tsx           │             │  │
│  │  │  (Dashboard)          │  │  (Profile Management)  │             │  │
│  │  │                       │  │                        │             │  │
│  │  │  • Display welcome    │  │  • Edit name           │             │  │
│  │  │  • "Get Daily Tip"    │  │  • Select fitness goal │             │  │
│  │  │  • Call Cloud Func    │  │  • Choose diet pref    │             │  │
│  │  │  • Show AI response   │  │  • Save to Firestore   │             │  │
│  │  │  • Loading states     │  │  • Sign out button     │             │  │
│  │  └───────────────────────┘  └────────────────────────┘             │  │
│  │           │                           │                              │  │
│  └───────────┼───────────────────────────┼──────────────────────────────┘  │
│              │                           │                                 │
└──────────────┼───────────────────────────┼─────────────────────────────────┘
               │                           │
               │ Firebase Functions        │ Firestore
               │ HTTP Call                 │ Read/Write
               │ (Auto includes ID Token)  │
               │                           │
┌──────────────▼───────────────────────────▼─────────────────────────────────┐
│                                                                             │
│                      FIREBASE BACKEND LAYER                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                     Firebase Authentication                         │  │
│  │                                                                      │  │
│  │  • User registration & login                                        │  │
│  │  • ID Token generation (JWT)                                        │  │
│  │  • Token refresh (auto, every 1 hour)                               │  │
│  │  • Token validation                                                  │  │
│  │  • User session management                                          │  │
│  │                                                                      │  │
│  │  Token Structure:                                                   │  │
│  │  {                                                                   │  │
│  │    "user_id": "abc123",                                             │  │
│  │    "email": "user@example.com",                                     │  │
│  │    "exp": 1700003599,  ← Expires in 1 hour                          │  │
│  │    "iat": 1699999999   ← Issued at                                  │  │
│  │  }                                                                   │  │
│  └──────────────────────────────────────┬──────────────────────────────┘  │
│                                         │                                  │
│                                         │ Validates token                  │
│                                         │                                  │
│  ┌──────────────────────────────────────▼──────────────────────────────┐  │
│  │              Cloud Functions (getDailyTipTool)                      │  │
│  │                                                                      │  │
│  │  Trigger: HTTPS Callable (functions.https.onCall)                   │  │
│  │                                                                      │  │
│  │  STEP 1: Validate Authentication                                    │  │
│  │  ┌────────────────────────────────────────┐                        │  │
│  │  │ if (!context.auth) {                   │                        │  │
│  │  │   throw HttpsError('unauthenticated')  │                        │  │
│  │  │ }                                       │                        │  │
│  │  └────────────────────────────────────────┘                        │  │
│  │            │                                                         │  │
│  │            ▼                                                         │  │
│  │  STEP 2: Extract Verified User ID                                   │  │
│  │  ┌────────────────────────────────────────┐                        │  │
│  │  │ const userId = context.auth.uid        │                        │  │
│  │  └────────────────────────────────────────┘                        │  │
│  │            │                                                         │  │
│  │            ▼                                                         │  │
│  │  STEP 3: Fetch User Profile                                         │  │
│  │  ┌────────────────────────────────────────┐                        │  │
│  │  │ const userDoc = await firestore()      │                        │  │
│  │  │   .collection('users')                 │  ─────────┐            │  │
│  │  │   .doc(userId)                         │           │            │  │
│  │  │   .get()                               │           │            │  │
│  │  └────────────────────────────────────────┘           │            │  │
│  │            │                                           │            │  │
│  │            ▼                                           │            │  │
│  │  STEP 4: Generate Personalized Prompt                 │            │  │
│  │  ┌────────────────────────────────────────┐           │            │  │
│  │  │ const prompt = `                       │           │            │  │
│  │  │   Fitness Goal: ${user.fitnessGoal}    │           │            │  │
│  │  │   Diet: ${user.dietaryPreference}      │           │            │  │
│  │  │   ...`                                  │           │            │  │
│  │  └────────────────────────────────────────┘           │            │  │
│  │            │                                           │            │  │
│  │            ▼                                           │            │  │
│  │  STEP 5: Call Gemini AI                               │            │  │
│  │  ┌────────────────────────────────────────┐           │            │  │
│  │  │ const result = await                   │           │            │  │
│  │  │   generativeModel                      │  ─────────┼──────┐     │  │
│  │  │   .generateContentStream(request)      │           │      │     │  │
│  │  └────────────────────────────────────────┘           │      │     │  │
│  │            │                                           │      │     │  │
│  │            ▼                                           │      │     │  │
│  │  STEP 6: Return Result                                │      │     │  │
│  │  ┌────────────────────────────────────────┐           │      │     │  │
│  │  │ return {                               │           │      │     │  │
│  │  │   tip: tipText,                        │           │      │     │  │
│  │  │   timestamp: serverTimestamp()         │           │      │     │  │
│  │  │ }                                       │           │      │     │  │
│  │  └────────────────────────────────────────┘           │      │     │  │
│  │                                                        │      │     │  │
│  └────────────────────────────────────────────────────────┼──────┼─────┘  │
│                                                           │      │        │
│  ┌────────────────────────────────────────────────────────▼──┐   │        │
│  │                    Cloud Firestore                        │   │        │
│  │                                                            │   │        │
│  │  Collection: users                                        │   │        │
│  │  ┌────────────────────────────────────────────────────┐  │   │        │
│  │  │  Document ID: {userId}                             │  │   │        │
│  │  │                                                     │  │   │        │
│  │  │  {                                                  │  │   │        │
│  │  │    name: "John Doe",                               │  │   │        │
│  │  │    fitnessGoal: "Weight Loss",                     │  │   │        │
│  │  │    dietaryPreference: "Vegan"                      │  │   │        │
│  │  │  }                                                  │  │   │        │
│  │  └────────────────────────────────────────────────────┘  │   │        │
│  │                                                            │   │        │
│  │  Security Rules:                                          │   │        │
│  │  • Users can only read/write their own document          │   │        │
│  │  • Enforced by Firebase Auth UID                         │   │        │
│  │                                                            │   │        │
│  └────────────────────────────────────────────────────────────┘   │        │
│                                                                    │        │
└────────────────────────────────────────────────────────────────────┼────────┘
                                                                     │
┌────────────────────────────────────────────────────────────────────▼────────┐
│                                                                             │
│                          GOOGLE CLOUD LAYER                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    Vertex AI / Gemini API                           │  │
│  │                                                                      │  │
│  │  Model: gemini-1.5-flash                                            │  │
│  │  Location: us-central1                                              │  │
│  │                                                                      │  │
│  │  Input:                                                             │  │
│  │  ┌────────────────────────────────────────────────────────────┐    │  │
│  │  │ You are a fitness coach...                                 │    │  │
│  │  │ Name: John Doe                                             │    │  │
│  │  │ Fitness Goal: Weight Loss                                  │    │  │
│  │  │ Dietary Preference: Vegan                                  │    │  │
│  │  │                                                             │    │  │
│  │  │ Provide a personalized tip...                              │    │  │
│  │  └────────────────────────────────────────────────────────────┘    │  │
│  │                                                                      │  │
│  │  Processing:                                                        │  │
│  │  • Natural language understanding                                   │  │
│  │  • Context-aware generation                                         │  │
│  │  • Personalization based on user profile                            │  │
│  │                                                                      │  │
│  │  Output:                                                            │  │
│  │  ┌────────────────────────────────────────────────────────────┐    │  │
│  │  │ "Based on your goal of weight loss and vegan diet,        │    │  │
│  │  │  start your day with a protein-rich smoothie using        │    │  │
│  │  │  plant-based protein powder, spinach, and berries.        │    │  │
│  │  │  This will keep you full and energized for your           │    │  │
│  │  │  morning workout!"                                         │    │  │
│  │  └────────────────────────────────────────────────────────────┘    │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

### 1. User Sign-Up/Sign-In

```
User Input → Login Screen → AuthContext
                              ↓
                        Firebase Auth
                              ↓
                        ID Token (JWT) Generated
                              ↓
                        AuthContext Updates
                              ↓
                        Root Layout Detects Change
                              ↓
                        Navigate to (tabs)
```

### 2. Profile Update

```
User Input → Profile Screen → Firestore SDK
                                  ↓
                            Security Rules Check
                                  ↓
                            users/{userId} Document Updated
                                  ↓
                            Success Callback
                                  ↓
                            UI Updated
```

### 3. AI Tip Generation

```
Button Press → Dashboard Screen
                    ↓
              functions().httpsCallable('getDailyTipTool')()
                    ↓
              [Firebase SDK Auto-adds ID Token]
                    ↓
              HTTPS Request to Cloud Function
                    ↓
              ┌──────────────────────────────┐
              │   Cloud Function Execution   │
              │   1. Validate token          │
              │   2. Extract user ID         │
              │   3. Fetch from Firestore    │
              │   4. Build AI prompt         │
              │   5. Call Vertex AI          │
              │   6. Return result           │
              └──────────────────────────────┘
                    ↓
              Response to Client
                    ↓
              Dashboard Updates UI
                    ↓
              Display Personalized Tip
```

## Security Layers

### Layer 1: Client-Side Auth Check
```
app/_layout.tsx checks if user is authenticated
If not → Redirect to login
```

### Layer 2: ID Token
```
Every request includes cryptographically signed JWT
Token contains verified user identity
Short-lived (1 hour), auto-refreshed
```

### Layer 3: Server-Side Validation
```
Cloud Function validates token
Rejects if:
  - No token provided
  - Token expired
  - Token signature invalid
  - Token from different project
```

### Layer 4: Firestore Security Rules
```
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}

Users can ONLY access their own data
```

### Layer 5: Function Authorization
```
const userId = context.auth.uid; // Always use verified ID
// Never trust client-provided user IDs
```

## Technology Stack

### Frontend
- **Framework**: React Native 0.81.5
- **Navigation**: Expo Router 6.0
- **Styling**: NativeWind (Tailwind CSS)
- **Language**: TypeScript
- **Build Tool**: Expo SDK 54

### Backend
- **Authentication**: Firebase Authentication
- **Database**: Cloud Firestore
- **Functions**: Cloud Functions for Firebase (Node.js 18)
- **AI**: Vertex AI (Gemini 1.5 Flash)

### Development Tools
- **Package Manager**: npm
- **Build System**: Expo Prebuild
- **Linting**: ESLint
- **Formatting**: Prettier

## File Structure

```
flipfeeds-app/
├── app/                          # Expo Router pages
│   ├── _layout.tsx              # Root layout (auth gateway)
│   ├── (auth)/                  # Auth group (login)
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   └── (tabs)/                  # Protected app group
│       ├── _layout.tsx
│       ├── index.tsx            # Dashboard
│       └── profile.tsx          # Profile management
│
├── contexts/
│   └── AuthContext.tsx          # Global auth state
│
├── lib/
│   └── firebaseConfig.ts        # Firebase initialization
│
├── functions/                   # Cloud Functions
│   ├── src/
│   │   └── index.ts            # getDailyTipTool function
│   ├── package.json
│   └── tsconfig.json
│
├── firestore.rules             # Firestore security rules
├── firestore.indexes.json      # Firestore indexes
├── firebase.json               # Firebase configuration
│
├── ios/                        # iOS native project
│   └── flipfeedsapp/
│       └── GoogleService-Info.plist
│
├── android/                    # Android native project
│   └── app/
│       └── google-services.json
│
└── Documentation/
    ├── README.md               # Main documentation
    ├── QUICKSTART.md           # Quick start guide
    ├── DEPLOYMENT.md           # Deployment guide
    ├── AUTHENTICATION.md       # Auth flow details
    ├── PRESENTATION.md         # Presentation script
    └── ARCHITECTURE.md         # This file
```

## Key Design Decisions

### Why expo-router?
- File-based routing (cleaner than manual navigation)
- Built-in authentication flow patterns
- Type-safe navigation
- Easy deep linking

### Why Cloud Functions instead of direct AI API calls?
- **Security**: API keys never exposed to client
- **Personalization**: Access to user data server-side
- **Control**: Rate limiting, logging, custom logic
- **Cost**: Monitor and limit usage

### Why onCall instead of HTTP functions?
- **Automatic token validation**
- **Built-in CORS handling**
- **Simpler client code**
- **Type-safe with Firebase SDK**

### Why Vertex AI instead of OpenAI?
- **Native GCP integration**
- **No separate API key needed**
- **Better latency** (same cloud)
- **Gemini 1.5 Flash performance**

## Scalability Considerations

### Current Architecture Supports

✅ **10K users**: Free tier  
✅ **100K users**: ~$50-100/month  
✅ **1M users**: ~$500-1000/month  

### Bottlenecks & Solutions

| Bottleneck | Solution |
|------------|----------|
| Function cold starts | Use min instances (paid feature) |
| Firestore reads | Cache user profiles in function memory |
| AI API latency | Implement streaming responses |
| Concurrent requests | Firebase auto-scales |

### Future Enhancements

1. **Caching**: Cache AI responses for common queries
2. **Rate Limiting**: Implement per-user daily limits
3. **App Check**: Add app attestation for security
4. **Analytics**: Track usage patterns
5. **Offline Support**: Cache recent tips locally

## Cost Breakdown (Estimated)

### For 10K MAU (Monthly Active Users)
- 1 tip per user per day
- 300K function invocations/month
- ~30M AI tokens/month

**Monthly Costs:**
- Cloud Functions: $0 (within free tier)
- Firestore: $0-5 (reads/writes)
- Vertex AI: $40-60 (Gemini 1.5 Flash)
- **Total: ~$40-65/month**

### For 100K MAU
- 3M function invocations/month
- ~300M AI tokens/month

**Monthly Costs:**
- Cloud Functions: $0-10
- Firestore: $20-40
- Vertex AI: $400-600
- **Total: ~$420-650/month**

## Monitoring & Observability

### Firebase Console
- **Authentication**: Active users, sign-in methods
- **Firestore**: Document reads/writes, storage
- **Functions**: Invocations, errors, execution time

### Google Cloud Console
- **Vertex AI**: API calls, latency, costs
- **Billing**: Cost breakdown by service
- **Logs**: Detailed function execution logs

### Recommended Alerts
1. Function error rate > 5%
2. Average latency > 10 seconds
3. Daily cost exceeds threshold
4. Failed authentication attempts spike

---

**This architecture provides a secure, scalable, and cost-effective foundation for AI-powered mobile applications.**
