# Setup Checklist - FlipFeeds App

Use this checklist to ensure everything is properly configured before running the app.

## ✅ Prerequisites

- [ ] Node.js 18+ installed
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Expo CLI installed (`npm install -g expo-cli`)
- [ ] iOS Simulator or Android Emulator ready
- [ ] Firebase project created
- [ ] Google Cloud billing enabled

## 🔧 Firebase Configuration

### Authentication
- [ ] Google Sign-In provider **enabled** in Firebase Console
- [ ] Web Client ID copied from Firebase Console
- [ ] Web Client ID pasted in `contexts/AuthContext.tsx` (line 22)

### Firestore
- [ ] Firestore Database created
- [ ] Security rules deployed (`firebase deploy --only firestore:rules`)

### Cloud Functions
- [ ] Vertex AI API enabled in Google Cloud Console
- [ ] Project ID updated in `functions/src/index.ts` (line 10)
- [ ] Functions dependencies installed (`cd functions && npm install`)
- [ ] Functions deployed (`firebase deploy --only functions`)

## 📱 Mobile App Configuration

### iOS
- [ ] `GoogleService-Info.plist` downloaded from Firebase Console
- [ ] File placed at `ios/flipfeedsapp/GoogleService-Info.plist`
- [ ] Pods installed (`cd ios && pod install && cd ..`)

### Android
- [ ] `google-services.json` downloaded from Firebase Console
- [ ] File placed at `android/app/google-services.json`
- [ ] SHA-1 fingerprint added to Firebase Console (for Google Sign-In)

## 🚀 Ready to Run

Once all items are checked:

```bash
# Install dependencies
npm install

# Run on iOS
npm run ios

# OR run on Android
npm run android
```

## 🧪 Testing Flow

1. [ ] App launches without errors
2. [ ] Login screen shows "Sign in with Google" button
3. [ ] Tapping button opens Google account picker
4. [ ] Sign in successful, redirects to Dashboard
5. [ ] Profile tab loads without errors
6. [ ] Can save fitness goal and dietary preference
7. [ ] "Get My Daily Tip" button works on Dashboard
8. [ ] AI-generated tip appears after 3-5 seconds

## ❌ Common Issues

### Google Sign-In fails with "Developer Error"
- **Check**: Web Client ID is correct in `AuthContext.tsx`
- **Check**: Google Sign-In is enabled in Firebase Console
- **Android**: SHA-1 fingerprint added to Firebase project

### Cloud Function fails with "unauthenticated"
- **Check**: User is signed in
- **Check**: Function is deployed (`firebase functions:list`)
- **Check**: Token is being sent from client

### "Module not found" errors
- **Run**: `npm install`
- **iOS**: `cd ios && pod install && cd ..`
- **Clean**: `npm run prebuild-clean`

## 📖 Need Help?

- [GOOGLE_SIGNIN_SETUP.md](./GOOGLE_SIGNIN_SETUP.md) - Detailed Google Sign-In setup
- [QUICKSTART.md](./QUICKSTART.md) - Step-by-step setup guide
- [README.md](./README.md) - Full documentation
- [DOCS_INDEX.md](./DOCS_INDEX.md) - All documentation files

---

**Last Updated**: After switching to Google Sign-In authentication
