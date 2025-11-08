# Pre-Presentation Checklist

Use this checklist to ensure your demo and presentation run smoothly.

## 📅 One Week Before

### Firebase Project Setup
- [ ] Create Firebase project (or verify existing)
- [ ] Enable Firebase Authentication (Email/Password)
- [ ] Create Firestore database
- [ ] Deploy Firestore security rules
- [ ] Enable Vertex AI API in Google Cloud Console
- [ ] Set up billing account (Blaze plan required for Vertex AI)
- [ ] Deploy Cloud Functions
- [ ] Test Cloud Functions with Firebase emulators

### Mobile App Setup
- [ ] Clone/pull latest code
- [ ] Run `npm install` in root directory
- [ ] Run `npm install` in functions directory
- [ ] Add iOS `GoogleService-Info.plist`
- [ ] Add Android `google-services.json`
- [ ] Update `lib/firebaseConfig.ts` with your Firebase config
- [ ] Update `functions/src/index.ts` with your project ID
- [ ] Run `npm run prebuild-clean`
- [ ] Test app on iOS simulator
- [ ] Test app on Android emulator
- [ ] Create test user account
- [ ] Test complete flow: signup → profile → AI tip

### Documentation Review
- [ ] Read through PRESENTATION.md
- [ ] Review slide talking points
- [ ] Practice code walkthroughs
- [ ] Prepare answers to common questions
- [ ] Review AUTHENTICATION.md for security deep dive

## 📅 One Day Before

### Technical Setup
- [ ] Charge all devices (laptop, phone, tablet)
- [ ] Test projector/screen sharing
- [ ] Verify internet connection (venue or hotspot)
- [ ] Download all dependencies (no live npm install)
- [ ] Test Firebase Console access
- [ ] Clear browser cache/cookies
- [ ] Close unnecessary applications
- [ ] Disable notifications on all devices

### Demo Preparation
- [ ] Create fresh test user account (delete old ones)
- [ ] Verify Cloud Functions are deployed and working
- [ ] Test complete user flow 3 times
- [ ] Prepare backup demo video (in case of live demo failure)
- [ ] Screenshot working demo as backup slides
- [ ] Test function logs visibility in Firebase Console
- [ ] Verify Firestore data is visible

### Presentation Materials
- [ ] Export slides to PDF (backup)
- [ ] Print speaker notes
- [ ] Prepare business cards / contact info
- [ ] Bring dongles/adapters (USB-C, HDMI, etc.)
- [ ] Save all files to USB drive (backup)

## 📅 Day of Presentation

### 2 Hours Before
- [ ] Arrive early at venue
- [ ] Test A/V setup
- [ ] Connect to WiFi (or enable hotspot)
- [ ] Open all necessary applications:
  - [ ] Terminal (for running app)
  - [ ] VS Code (for code walkthrough)
  - [ ] Firefox/Chrome (Firebase Console)
  - [ ] Simulator (iOS/Android)
  - [ ] Presentation slides
- [ ] Position windows for easy switching
- [ ] Increase font size in:
  - [ ] Terminal (18pt+)
  - [ ] VS Code (18pt+)
  - [ ] Browser (zoom to 150%)
- [ ] Close unneeded browser tabs
- [ ] Disable browser auto-fill/suggestions
- [ ] Turn off browser notifications

### 30 Minutes Before
- [ ] Run the app once to verify it works
- [ ] Sign out current user (start fresh)
- [ ] Clear recent tips (Firestore)
- [ ] Open Firebase Console tabs:
  - [ ] Authentication → Users
  - [ ] Firestore → Data
  - [ ] Functions → Logs
- [ ] Open VS Code to key files:
  - [ ] `app/_layout.tsx`
  - [ ] `app/(tabs)/index.tsx`
  - [ ] `functions/src/index.ts`
- [ ] Have README.md open for reference
- [ ] Set up water nearby
- [ ] Do a final test run

## 🎤 During Presentation

### Introduction (First 2 Minutes)
- [ ] Introduce yourself
- [ ] State the problem (insecure API keys)
- [ ] Preview the solution (tool server pattern)
- [ ] Set expectations (30 min, live demo, Q&A)

### Live Demo Checklist
- [ ] Start screen recording (just in case)
- [ ] Zoom browser to 150%
- [ ] Increase terminal font size
- [ ] Show app on simulator/device
- [ ] Sign up new user (use memorable email)
- [ ] Set profile preferences
- [ ] Get AI tip
- [ ] Show Firebase Console:
  - [ ] New user in Authentication
  - [ ] Profile data in Firestore
  - [ ] Function execution in Logs
- [ ] Highlight key security points

### Code Walkthrough
- [ ] Start with mobile app (client-side)
- [ ] Show AuthContext
- [ ] Show root layout auth gateway
- [ ] Show dashboard Cloud Function call
- [ ] Switch to backend (server-side)
- [ ] Show Cloud Function structure
- [ ] Explain token validation
- [ ] Show user data fetch
- [ ] Show AI prompt generation

### Security Deep Dive
- [ ] Explain ID Token (JWT)
- [ ] Show what's in the token (jwt.io)
- [ ] Explain automatic validation
- [ ] Discuss attack scenarios prevented
- [ ] Show Firestore security rules

### Q&A
- [ ] Repeat questions for audience
- [ ] Be honest if you don't know
- [ ] Offer to follow up via email
- [ ] Direct to documentation for details

## 🚨 Emergency Backup Plans

### If Live Demo Fails
- [ ] **Plan A**: Switch to pre-recorded video
- [ ] **Plan B**: Use screenshots in slides
- [ ] **Plan C**: Code walkthrough only (no demo)

### If Internet Fails
- [ ] Use mobile hotspot
- [ ] Show local emulator instead
- [ ] Use offline slides/documentation

### If Simulator Crashes
- [ ] Have backup device ready
- [ ] Use pre-recorded video
- [ ] Show Firebase Console only

### If Cloud Functions Fail
- [ ] Check Firebase Console logs
- [ ] Explain expected behavior
- [ ] Show code implementation instead

## ✅ Post-Presentation

### Immediately After
- [ ] Thank the audience
- [ ] Share links to GitHub repo
- [ ] Offer to answer questions offline
- [ ] Collect feedback/questions

### Follow-Up (Within 24 Hours)
- [ ] Post slides/resources to conference portal
- [ ] Share GitHub repo link on social media
- [ ] Respond to questions received
- [ ] Thank organizers

### Long-Term
- [ ] Update code based on feedback
- [ ] Fix any issues discovered
- [ ] Consider blog post about experience
- [ ] Reuse for future talks

## 🎯 Success Criteria

Your presentation will be successful if attendees:
- ✅ Understand the security risk of exposed API keys
- ✅ Learn the tool server pattern
- ✅ See how Firebase Auth validates tokens
- ✅ Can clone and run the project themselves
- ✅ Feel confident implementing this pattern

## 📝 Notes Section

Use this space for venue-specific notes:

**Venue WiFi:**
- Network: _______________
- Password: _______________

**A/V Contact:**
- Name: _______________
- Phone: _______________

**Presentation Time:**
- Start: _______________
- End: _______________

**Room Setup:**
- Podium: Yes / No
- Projector Resolution: _______________
- Audio: Mic / No Mic

**Emergency Contacts:**
- Conference Organizer: _______________
- Tech Support: _______________

---

## 🎬 Final Checks (5 Minutes Before)

- [ ] Silence phone
- [ ] Close email/Slack
- [ ] Disable system notifications
- [ ] Turn on "Do Not Disturb"
- [ ] Check mic is working
- [ ] Verify screen is mirrored/extended correctly
- [ ] Take a deep breath
- [ ] Smile

**You've got this! 🚀**

---

## 📊 Presentation Scoring (Fill out after)

Rate yourself on:

**Technical Content** (1-5): ___  
**Clarity of Explanation** (1-5): ___  
**Demo Success** (1-5): ___  
**Audience Engagement** (1-5): ___  
**Time Management** (1-5): ___  

**What went well:**
_________________________________
_________________________________

**What to improve:**
_________________________________
_________________________________

**Audience questions asked:**
_________________________________
_________________________________

**Follow-up needed:**
_________________________________
_________________________________
