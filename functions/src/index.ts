import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { VertexAI } from '@google-cloud/vertexai';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize Vertex AI with your project ID
const vertexAI = new VertexAI({
    project: 'flipfeeds-app', // Replace with your actual project ID
    location: 'us-central1',
});

// Reference to the generative model
const generativeModel = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
});

interface UserProfile {
    name: string;
    fitnessGoal: string;
    dietaryPreference: string;
}

/**
 * getDailyTipTool - Secure Cloud Function for AI-Powered Fitness Tips
 * 
 * This function demonstrates:
 * 1. Firebase Authentication token validation
 * 2. Secure user data retrieval from Firestore
 * 3. Personalized AI content generation using Gemini
 * 4. Proper error handling and security practices
 */
export const getDailyTipTool = onCall(async (request) => {
    // STEP 1: Validate Authentication
    // The Firebase SDK automatically validates the ID token for onCall functions
    // and populates request.auth with the user information
    if (!request.auth) {
        throw new HttpsError(
            'unauthenticated',
            'User must be authenticated to call this function.'
        );
    }

    const userId = request.auth.uid;

    try {
        // STEP 2: Fetch User Preferences from Firestore
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(userId)
            .get();

        if (!userDoc.exists) {
            throw new HttpsError(
                'not-found',
                'User profile not found. Please complete your profile first.'
            );
        }

        const userProfile = userDoc.data() as UserProfile;

        // STEP 3: Generate Personalized Prompt
        const prompt = `You are a professional fitness and nutrition coach. Generate a personalized daily tip for a user with the following profile:

Name: ${userProfile.name}
Fitness Goal: ${userProfile.fitnessGoal}
Dietary Preference: ${userProfile.dietaryPreference}

Provide a single, actionable tip that is:
- Specific to their fitness goal
- Respects their dietary preferences
- Practical and easy to implement today
- Motivating and positive in tone
- Between 50-100 words

Just provide the tip directly, without any preamble or labels.`;

        // STEP 4: Call Gemini AI via Vertex AI
        const request = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        };

        const streamingResult = await generativeModel.generateContentStream(request);
        const aggregatedResponse = await streamingResult.response;

        // Extract the generated text
        const tipText = aggregatedResponse.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!tipText) {
            throw new HttpsError(
                'internal',
                'Failed to generate AI response.'
            );
        }

        // STEP 5: Return the Result
        return {
            tip: tipText.trim(),
            timestamp: FieldValue.serverTimestamp(),
        };

    } catch (error: any) {
        // Log the error for debugging (visible in Firebase Console)
        console.error('Error in getDailyTipTool:', error);

        // Return appropriate error to client
        if (error instanceof HttpsError) {
            throw error;
        }

        throw new HttpsError(
            'internal',
            'An error occurred while generating your daily tip.',
            error.message
        );
    }
});
