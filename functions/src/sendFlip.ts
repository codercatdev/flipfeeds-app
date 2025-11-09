import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';

const vertexAI = new VertexAI({
    project: 'flipfeeds-app',
    location: 'us-central1',
});

const generativeModel = vertexAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
});

export const sendFlip = onCall(async (request) => {
    // STEP 1: Validate Authentication
    if (!request.auth) {
        throw new HttpsError(
            'unauthenticated',
            'User must be authenticated to send a flip.'
        );
    }

    const senderUid = request.auth.uid;
    const { recipientUid } = request.data;

    if (!recipientUid) {
        throw new HttpsError('invalid-argument', 'recipientUid is required');
    }

    try {
        // STEP 2: Verify App Check (in production)
        // App Check token is automatically verified by the SDK when configured

        // STEP 3: Fetch prompt template from Remote Config
        const remoteConfig = admin.remoteConfig();
        const template = await remoteConfig.getTemplate();
        const flipPrompt = template.parameters['flip_prompt_template']?.defaultValue?.value || 
            'Generate a single, short, SFW piece of micro-content. It could be a weird fact, a 1-sentence joke, or a bizarre compliment. Be quirky and fun. Keep it under 100 characters.';

        // STEP 4: Generate AI content using Vertex AI (Gemini)
        const aiRequest = {
            contents: [{ role: 'user', parts: [{ text: flipPrompt as string }] }],
        };

        const streamingResult = await generativeModel.generateContentStream(aiRequest);
        const aggregatedResponse = await streamingResult.response;
        const generatedContent = aggregatedResponse.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedContent) {
            throw new HttpsError('internal', 'Failed to generate AI content');
        }

        // STEP 5: Update Flip Streak in Realtime Database
        const streakKey = [senderUid, recipientUid].sort().join('_');
        const streakRef = admin.database().ref(`flip_streaks/${streakKey}`);
        
        await streakRef.transaction((currentData) => {
            return {
                count: (currentData?.count || 0) + 1,
                lastFlipTimestamp: Date.now(),
            };
        });

        // STEP 6: Get recipient's FCM token from Firestore
        const recipientDoc = await admin.firestore().collection('users').doc(recipientUid).get();
        
        if (!recipientDoc.exists) {
            throw new HttpsError('not-found', 'Recipient user not found');
        }

        const recipientData = recipientDoc.data();
        const fcmToken = recipientData?.fcmToken;

        // Get sender's name for the notification
        const senderDoc = await admin.firestore().collection('users').doc(senderUid).get();
        const senderName = senderDoc.data()?.displayName || 'Someone';

        // STEP 7: Send push notification via FCM
        if (fcmToken) {
            const message = {
                token: fcmToken,
                notification: {
                    title: `${senderName} flipped you! 🔄`,
                    body: generatedContent.substring(0, 100),
                },
                data: {
                    senderId: senderUid,
                    senderName,
                    content: generatedContent,
                    type: 'flip',
                },
            };

            await admin.messaging().send(message);
        }

        // STEP 8: Log Analytics event
        await admin.analytics().logEvent('flip_sent', {
            sender_uid: senderUid,
            recipient_uid: recipientUid,
        });

        // Return success
        return {
            success: true,
            message: 'Flip sent successfully',
            content: generatedContent,
        };

    } catch (error) {
        console.error('Error in sendFlip function:', error);
        throw new HttpsError('internal', 'Failed to send flip: ' + (error as Error).message);
    }
});
