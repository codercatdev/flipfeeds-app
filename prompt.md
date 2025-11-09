### **Prompt for Generative AI Code Generation**

**`prompt.md`**

**Persona:** Act as a senior full-stack developer with expert-level proficiency in React Native, Expo, NativeWind, and the entire Google Firebase suite. Your mission is to generate the complete codebase for a new mobile application called "FlipFeeds."

**High-Level Application Concept: FlipFeeds**

`FlipFeeds` is an "anti-social" social app inspired by the simplicity of the "Yo" app. The core premise is to "flip" your social feed from endless noise into a single, fun, one-on-one interaction.

  * **Core Mechanic:** There is no public feed. The main screen is just a list of the user's friends. Next to each friend is a single button: **"FLIP"**.
  * **The "Flip":** When a user taps "FLIP," the app calls a secure backend "tool" that uses generative AI to create a quirky, fun piece of micro-content (a joke, weird fact, compliment, etc.).
  * **The Delivery:** The recipient immediately receives a push notification. Upon opening the app, they see the unique, AI-generated message sent from their friend.
  * **The Goal:** Facilitate fun, low-effort, positive connections without the pressure and noise of traditional social media.

-----

### **Part 1: Tech Stack & Project Structure**

The entire application must be built using the following technologies:

1.  **Frontend (Mobile App):**

      * **Framework:** React Native with the latest Expo SDK.
      * **Routing:** **`expo-router`** for file-based routing and layouts.
      * **Styling:** **`NativeWind`** (v5) for all UI components, using utility-first classes, the primary color should be #F97316 like the logo.
      * **State Management:** An existing **`AuthContext`** will be provided and should be used to manage the user's authentication state throughout the app.

2.  **Backend & Infrastructure:**

      * **Platform:** **Google Firebase**. The project must utilize *every* Firebase service listed in the dependencies below.

3.  **Required Dependencies (Client-side):**

   * **Package:** everything found in package.json 

-----

### **Part 2: Firebase Backend Architecture**

The backend will be completely serverless, orchestrated by Google Cloud Functions.

**1. Primary Tool Server: `sendFlip` Cloud Function**
This is the most critical component and the centerpiece of the talk.

  * **Trigger:** HTTP Request (`httpsCallable`).
  * **Inputs:** A JSON object `{ "recipientUid": string }`.
  * **Security (CRITICAL):**
    1.  The function must require a valid **Firebase Auth ID token**. It must validate the token using the Admin SDK at the very beginning of its execution.
    2.  The function must be protected by **Firebase App Check**. It must verify the App Check token before proceeding.
  * **Core Logic (in order):**
    1.  Verify Auth and App Check tokens. Extract the sender's `uid` from the validated Auth token.
    2.  Fetch a parameter from **Remote Config** named `flip_prompt_template`. This will contain the prompt for the AI model (e.g., "Generate a one-sentence, SFW, quirky fun fact.").
    3.  Use the **Vertex AI for Firebase SDK** (Gemini) to generate a short text string based on the fetched prompt.
    4.  Access the **Realtime Database** at a path like `flip_streaks/{composite_key}` (where `composite_key` is a sorted combination of sender and recipient UIDs). Increment the streak counter.
    5.  Fetch the recipient's FCM token from their user document in **Firestore**.
    6.  Use the **Firebase Admin Messaging (FCM) SDK** to construct and send a push notification to the recipient's device. The payload should include the sender's name and the generated AI content.
    7.  Log a custom event to **Firebase Analytics** named `flip_sent` with `sender_uid` and `recipient_uid` parameters.
    8.  Return a success status to the client app.

**2. Database & Storage Schema:**

  * **Cloud Firestore:**
      * `users/{uid}`: `displayName`, `photoURL`, `fcmToken`.
      * `friendships/{docId}`: `users: [uid1, uid2]`, `status: 'pending' | 'accepted'`, `requesterId`.
  * **Realtime Database:**
      * `flip_streaks/{composite_key}`: `{ count: number, lastFlipTimestamp: number }`.
  * **Cloud Storage:**
      * `profile-pictures/{uid}.jpg`: Publicly readable images for user profiles.

-----

### **Part 3: Expo Router Client Application (`app` directory)**

Generate the complete file structure and code for the React Native app.

**1. Root Layout (`app/_layout.tsx`):**

  * This file is the authentication gateway.
  * It should wrap the app in the `AuthContext.Provider`.
  * It will use the `useAuth()` hook to check the user's status.
  * If `user` is null, it renders the `(auth)` stack.
  * If `user` is present, it renders the `(tabs)` stack.
  * This is also where you will initialize services like **Crashlytics**, **Performance Monitoring**, and **App Check**.

**2. Auth Stack (`app/(auth)/`):**

  * `_layout.tsx`: A simple `<Stack />` navigator.
  * `login.tsx`: A styled screen (using NativeWind) for Email/Password and Google Sign-In with Firebase Auth.

**3. Main Tabs Stack (`app/(tabs)/`):**

  * `_layout.tsx`: Configures a `<Tabs />` navigator with two tabs: "Friends" (index) and "Profile".
  * **`index.tsx` (Friends Screen):**
      * Fetches and displays the user's accepted friends from Firestore.
      * For each friend, it shows their profile picture, `displayName`, and a real-time updating "Flip Streak" counter (🔥) from the **Realtime Database**.
      * The **"FLIP" button**:
          * On press, it calls the `sendFlip` Cloud Function using the **`@react-native-firebase/functions`** SDK.
          * The call should be wrapped in a custom trace from the **`@react-native-firebase/perf`** SDK to monitor its duration.
          * It should display a loading state while the function is executing.
  * **`profile.tsx` (Profile Screen):**
      * Displays the user's `displayName` and profile picture.
      * Includes a button to upload a new profile picture to **Firebase Storage**.
      * **ML Kit Demo:** After an image is selected but before uploading, use the **`@react-native-firebase/ml`** on-device **Image Labeling** API to analyze the photo and display the top 3 detected labels (e.g., "Smile," "Selfie," "Outdoors") on the screen.
      * Contains a "Sign Out" button.
  * **(Modal Screen) `addFriend.tsx`:**
      * A screen, presented as a modal, to search for other users by `displayName` and send friend requests (creates a `pending` document in the `friendships` collection).

**4. Push Notifications & In-App Messaging:**

  * The app must request push notification permissions on startup.
  * When a new FCM token is received, it must be saved to the current user's document in Firestore.
  * **In-App Messaging** should be initialized to allow for campaign-based messaging.

-----

### **Part 4: `README.md` File**

Finally, generate a comprehensive `README.md` file that includes:

1.  A project overview of FlipFeeds.
2.  An architectural diagram showing the user, the app, and the Firebase backend services involved in a "Flip."
3.  **Setup Instructions:**
      * Firebase project creation and configuration steps (enabling all required services).
      * Instructions for deploying the Cloud Function(s).
      * How to set up the `flip_prompt_template` in Remote Config.
      * Client-side setup, including installing dependencies and configuring `firebase.json` for Expo.
4.  A clear explanation of the secure "tool server" pattern, highlighting the role of Auth ID Tokens and App Check.
