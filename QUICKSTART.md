# FlipFeeds Quick Start Guide

## What We've Built

FlipFeeds is a complete React Native mobile app with a Firebase backend that demonstrates all major Firebase services in a fun, practical way.

### Core Features Implemented

✅ **Authentication**: Email/Password + Google Sign-In  
✅ **Friends System**: Search users, send friend requests  
✅ **FLIP Mechanism**: AI-powered content generation  
✅ **Real-time Streaks**: Live updating flip counters  
✅ **Push Notifications**: FCM integration  
✅ **Image Upload**: Profile pictures with ML Kit labeling  
✅ **Security**: Firestore & RTDB rules, App Check ready  

## What's Different from the Original App

### Removed (Old Fitness App Features)
- ❌ Fitness goals and dietary preferences
- ❌ Daily tips feature
- ❌ `getDailyTipTool` Cloud Function

### Added (FlipFeeds Features)
- ✅ Friends list and friendships management
- ✅ FLIP button and sendFlip Cloud Function
- ✅ Real-time flip streaks in Realtime Database
- ✅ FCM token management in AuthContext
- ✅ Remote Config integration for AI prompts
- ✅ Performance monitoring with custom traces
- ✅ ML Kit image labeling demo
- ✅ Add Friend modal with search
- ✅ Complete security rules

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. iOS Setup (Mac only)
```bash
cd ios
pod install
cd ..
```

### 3. Run the App
```bash
# Start Metro bundler
npm start

# In separate terminals:
npm run ios     # iOS
npm run android # Android
```

### 4. Deploy Cloud Functions (when ready)
```bash
cd functions
npm install
npm run build
firebase login
firebase use flipfeeds-app  # or your project ID
firebase deploy --only functions
cd ..
```

## Testing the App

### Without Cloud Functions Deployed
- ✅ Sign up / Sign in works
- ✅ Profile screen works
- ✅ Add friend modal works
- ❌ FLIP button will fail (needs Cloud Function)

### With Cloud Functions Deployed
- ✅ Everything works!
- ✅ FLIP button generates AI content
- ✅ Push notifications sent
- ✅ Streaks update in real-time

## Firebase Setup Checklist

Before deploying, ensure these are configured in Firebase Console:

### Authentication
- [ ] Email/Password provider enabled
- [ ] Google Sign-In provider enabled
- [ ] OAuth consent screen configured

### Firestore
- [ ] Database created
- [ ] Rules deployed: `firebase deploy --only firestore:rules`

### Realtime Database
- [ ] Database created
- [ ] Rules deployed: `firebase deploy --only database`

### Cloud Functions
- [ ] Billing enabled (required for Cloud Functions)
- [ ] Vertex AI API enabled
- [ ] Functions deployed: `firebase deploy --only functions`

### Storage
- [ ] Storage bucket created
- [ ] Default rules acceptable for now

### Cloud Messaging (FCM)
- [ ] Enabled automatically
- [ ] APNs key uploaded for iOS (in Apple Developer Console)

### Remote Config
- [ ] Parameter `flip_prompt_template` created
- [ ] Default value set (see README)

### App Check (Production)
- [ ] App registered
- [ ] Play Integrity configured (Android)
- [ ] App Attest configured (iOS)

## File Structure Overview

```
Key Files Created/Modified:

types/index.ts                    # TypeScript definitions
contexts/AuthContext.tsx          # Updated with FCM, email auth
lib/firebaseConfig.ts             # All Firebase services initialized
app/_layout.tsx                   # FCM handlers added
app/(auth)/login.tsx              # Email + Google auth
app/(tabs)/_layout.tsx            # Friends & Profile tabs
app/(tabs)/index.tsx              # Friends screen (FLIP buttons)
app/(tabs)/profile.tsx            # Profile with ML Kit
app/modal.tsx                     # Add Friend modal
functions/src/sendFlip.ts         # Main Cloud Function
functions/src/index.ts            # Exports sendFlip
firestore.rules                   # Security rules
database.rules.json               # RTDB rules
firebase.json                     # Added database config
README.md                         # Complete documentation
```

## Common Issues & Solutions

### iOS Build Issues
```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
```

### Android Build Issues
```bash
cd android
./gradlew clean
cd ..
```

### Firebase Connection Issues
- Verify `google-services.json` is in `android/app/`
- Verify `GoogleService-Info.plist` is in `ios/flipfeedsapp/`
- Check Firebase project ID matches in all files

### Cloud Function Errors
- Ensure billing is enabled
- Check Vertex AI API is enabled in Google Cloud Console
- Verify Remote Config parameter exists
- Check Cloud Function logs: `firebase functions:log`

## Next Steps

1. **Test Locally**: Run the app on simulators/emulators
2. **Deploy Functions**: Deploy the sendFlip Cloud Function
3. **Configure Remote Config**: Set the AI prompt template
4. **Test FLIP**: Create test users and try flipping
5. **Monitor**: Check Firebase Console for analytics, performance data
6. **Distribute**: Use Firebase App Distribution for beta testing

## Demo Script

For showcasing the app:

1. **Setup**: Two simulators/devices with different test accounts
2. **Sign In**: Show email + Google authentication
3. **Add Friend**: Demonstrate friend search and request
4. **Accept Request**: (Can be manual in Firestore for demo)
5. **FLIP**: Tap FLIP button
6. **Show Function Code**: Highlight the 7-step process
7. **Notification**: Show push notification on recipient device
8. **Streak**: Show real-time streak update 🔥
9. **Remote Config**: Change prompt in console, show new content
10. **Profile**: Upload image, show ML Kit labels

---

🎉 **You're all set! Happy coding and flipping!** 🔄
