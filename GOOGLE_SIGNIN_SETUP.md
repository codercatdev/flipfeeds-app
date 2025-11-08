# Google Sign-In Setup Guide

## Prerequisites

You need to configure Google Sign-In in your Firebase project before the app will work.

## Step 1: Enable Google Sign-In in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`flipfeeds-app`)
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google** in the providers list
5. Click **Enable**
6. Click **Save**

## Step 2: Get Your Web Client ID

### For iOS:

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Find your iOS app
4. Copy the **Web Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)

### For Android:

1. In Firebase Console, go to **Project Settings**
2. Scroll down to **Your apps** section  
3. Find your Android app
4. Copy the **Web Client ID**

## Step 3: Update the Web Client ID in Code

Open `contexts/AuthContext.tsx` and replace the placeholder:

```typescript
GoogleSignin.configure({
  webClientId: 'YOUR-ACTUAL-WEB-CLIENT-ID.apps.googleusercontent.com', // ← Replace this
});
```

With your actual Web Client ID:

```typescript
GoogleSignin.configure({
  webClientId: '361402949529-abc123xyz.apps.googleusercontent.com', // ← Your actual ID
});
```

## Step 4: iOS Configuration

### Add URL Scheme to Info.plist

The `GoogleService-Info.plist` already contains the necessary configuration. No additional steps needed!

### Install Pods

```bash
cd ios
pod install
cd ..
```

## Step 5: Android Configuration

### Update android/build.gradle

Make sure you have Google Services plugin (should already be configured):

```gradle
dependencies {
    classpath 'com.google.gms:google-services:4.3.15'
}
```

### Verify google-services.json

Ensure `android/app/google-services.json` exists and is from your Firebase project.

## Step 6: Test the App

### iOS:
```bash
npm run ios
```

### Android:
```bash
npm run android
```

## Troubleshooting

### "Developer Error" on Android

**Problem**: App shows "Developer Error" when signing in

**Solution**: 
1. Get your SHA-1 fingerprint:
   ```bash
   cd android
   ./gradlew signingReport
   ```
2. Copy the SHA-1 from `debug` variant
3. Go to Firebase Console → Project Settings → Your Android app
4. Add the SHA-1 fingerprint
5. Download new `google-services.json`
6. Replace `android/app/google-services.json`
7. Rebuild the app

### "DEVELOPER_ERROR" on iOS

**Problem**: Sign-in fails with developer error

**Solution**:
1. Verify the Web Client ID is correct in `AuthContext.tsx`
2. Ensure `GoogleService-Info.plist` is in `ios/flipfeedsapp/`
3. Clean build:
   ```bash
   cd ios
   rm -rf Pods Podfile.lock
   pod install
   cd ..
   npm run ios
   ```

### Sign-in button doesn't work

**Solution**:
1. Check Firebase Console → Authentication → Sign-in method
2. Ensure Google is **Enabled**
3. Verify the Web Client ID matches the one in Firebase Console

## Finding Your Web Client ID

1. Firebase Console → Project Settings
2. Scroll to "Your apps"
3. Select your app (iOS or Android)
4. Look for "Web Client ID" in the config

OR

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" → "Credentials"
4. Find the "Web client" (auto-created by Firebase)
5. Copy the Client ID

## Important Notes

- **Web Client ID** is different from your app's Client ID
- You need the **Web Client ID** (ends with `apps.googleusercontent.com`)
- The same Web Client ID works for both iOS and Android
- Don't commit your Web Client ID to public repos (though it's not as sensitive as API keys)

## Verification

After setup, you should be able to:
1. ✅ Launch the app
2. ✅ See "Sign in with Google" button
3. ✅ Tap button and see Google account picker
4. ✅ Select account and sign in successfully
5. ✅ Be redirected to the Dashboard

## Next Steps

Once signed in:
1. Go to Profile tab
2. Set your fitness goal
3. Choose dietary preference
4. Save profile
5. Return to Dashboard
6. Tap "Get My Daily Tip"
7. See personalized AI-generated tip!

---

**Need help?** Check the main [README.md](./README.md) or [QUICKSTART.md](./QUICKSTART.md)
