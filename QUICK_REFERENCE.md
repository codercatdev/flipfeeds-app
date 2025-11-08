# FlipFeeds Quick Reference Card

## 🚀 Quick Commands

```bash
# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Build functions
cd functions && npm run build

# Deploy functions
firebase deploy --only functions

# View function logs
firebase functions:log

# Start emulators
firebase emulators:start
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `contexts/AuthContext.tsx` | Authentication state |
| `app/_layout.tsx` | Root layout (auth gateway) |
| `app/(auth)/login.tsx` | Login screen |
| `app/(tabs)/index.tsx` | Dashboard |
| `app/(tabs)/profile.tsx` | Profile management |
| `functions/src/index.ts` | Cloud Function |
| `firestore.rules` | Security rules |

## 🔐 Authentication Flow

```
Sign In → Firebase Auth → ID Token → App State Update → Navigate to (tabs)
```

## 🤖 AI Tip Flow

```
Button Press → Cloud Function → Validate Token → Fetch Profile → 
Generate Prompt → Call Gemini → Return Tip
```

## 🔑 Important IDs/Keys

**Firebase Project ID**: `flipfeeds-app`  
**iOS Bundle ID**: `com.codercatdev.flipfeedsapp`  
**Android Package**: `com.codercatdev.flipfeedsapp`  
**Cloud Region**: `us-central1`  
**Gemini Model**: `gemini-1.5-flash`

## 📱 User Flow

1. **Sign Up** → Create account
2. **Profile** → Set preferences
3. **Dashboard** → Get AI tip
4. **Sign Out** → From profile

## 🛠️ Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| "Firebase not initialized" | Check GoogleService files exist |
| "Function not found" | Verify deployment: `firebase functions:list` |
| "Unauthenticated" | Sign out and back in |
| Build errors | `npm run prebuild-clean` |

## 📚 Documentation Quick Links

- **Getting Started**: [QUICKSTART.md](./QUICKSTART.md)
- **Full Docs**: [README.md](./README.md)
- **Security**: [AUTHENTICATION.md](./AUTHENTICATION.md)
- **Deploy**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Present**: [PRESENTATION.md](./PRESENTATION.md)
- **All Docs**: [DOCS_INDEX.md](./DOCS_INDEX.md)

## 🎯 Common Tasks

### Create New User
```
1. Tap "Sign Up"
2. Email: test@example.com
3. Password: password123
4. Auto-navigates to Dashboard
```

### Test AI Feature
```
1. Go to Profile
2. Set fitness goal and diet
3. Save profile
4. Go to Dashboard
5. Tap "Get My Daily Tip"
```

### View Backend Data
```
Firebase Console:
- Authentication → Users
- Firestore → users collection
- Functions → Logs
```

## 🔒 Security Checklist

- ✅ Never commit .env files
- ✅ Never hardcode API keys
- ✅ Always validate tokens server-side
- ✅ Use verified user ID from context.auth
- ✅ Enforce Firestore security rules
- ✅ Use HTTPS for all requests

## 💡 Pro Tips

1. **Use emulators** for local development
2. **Monitor logs** after deployment
3. **Test on real device** before presenting
4. **Clear Firestore data** between demos
5. **Have backup demo video** for presentations

## 📊 Cost Management

**Free Tier**:
- 125K function calls/month
- 50K document reads/day

**Monitoring**:
- Check Firebase Console → Usage
- Set up budget alerts in GCP

## 🎤 Demo Checklist

Before presenting:
- [ ] App running smoothly
- [ ] Fresh test account ready
- [ ] Firebase Console open
- [ ] VS Code with key files
- [ ] Emulators stopped (use production)
- [ ] Screen recording started
- [ ] Phone on Do Not Disturb

## 🆘 Emergency Contacts

- **Firebase Support**: firebase.google.com/support
- **Stack Overflow**: Tag with `firebase` + `react-native`
- **Discord**: Expo Discord, Firebase Discord

## 📈 Next Steps After Setup

1. ✅ Customize UI
2. ✅ Add more profile fields
3. ✅ Implement tip history
4. ✅ Add analytics
5. ✅ Enable push notifications
6. ✅ Add social login
7. ✅ Deploy to app stores

---

**Keep this card handy for quick reference!** 📌
