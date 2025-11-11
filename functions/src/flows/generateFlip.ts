import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit';

// Define the flip generation flow
export const generateFlipFlow = () => {
    const ai = genkit({
        plugins: [googleAI()],
        model: 'googleai/gemini-2.5-flash',
    });
    return ai.defineFlow(
        {
            name: 'generateFlip',
            inputSchema: z.string(),
            outputSchema: z.string(),
        },
        async (prompt: string) => {
            const { text } = await ai.generate({
                prompt: prompt,
                config: {
                    maxOutputTokens: 100,
                    temperature: 1.0,
                },
            });
            return text;
        }
    );
};

// export const sendFlip = onCall(async (request) => {

//     const senderUid = request.auth.uid;
//     const { recipientUid } = request.data;

//     if (!recipientUid) {
//         throw new HttpsError('invalid-argument', 'recipientUid is required');
//     }

//     try {
//         // STEP 2: Verify App Check (in production)
//         // App Check token is automatically verified by the SDK when configured

//         // STEP 3: Fetch prompt template from Remote Config
//         const remoteConfig = admin.remoteConfig();
//         const template = await remoteConfig.getTemplate();
//         const defaultValue = template.parameters['flip_prompt_template']?.defaultValue;

//         let flipPrompt = 'Generate a single, short, SFW piece of micro-content. It could be a weird fact, a 1-sentence joke, or a bizarre compliment. Be quirky and fun. Keep it under 100 characters.';

//         if (defaultValue && typeof defaultValue === 'object' && 'value' in defaultValue) {
//             flipPrompt = defaultValue.value as string;
//         }

//         // STEP 4: Generate AI content using Genkit Flow
//         // Genkit automatically traces and logs this operation
//         const generatedContent = await generateFlipFlow(flipPrompt);

//         if (!generatedContent) {
//             throw new HttpsError('internal', 'Failed to generate AI content');
//         }

//         // STEP 5: Update Flip Streak in Realtime Database
//         const streakKey = [senderUid, recipientUid].sort().join('_');
//         const streakRef = admin.database().ref(`flip_streaks/${streakKey}`);

//         await streakRef.transaction((currentData) => {
//             return {
//                 count: (currentData?.count || 0) + 1,
//                 lastFlipTimestamp: Date.now(),
//             };
//         });

//         // STEP 6: Get recipient's FCM token from Firestore
//         const recipientDoc = await admin.firestore().collection('users').doc(recipientUid).get();

//         if (!recipientDoc.exists) {
//             throw new HttpsError('not-found', 'Recipient user not found');
//         }

//         const recipientData = recipientDoc.data();
//         const fcmToken = recipientData?.fcmToken;

//         // Get sender's name for the notification
//         const senderDoc = await admin.firestore().collection('users').doc(senderUid).get();
//         const senderName = senderDoc.data()?.displayName || 'Someone';

//         // STEP 7: Send push notification via FCM
//         if (fcmToken) {
//             const message = {
//                 token: fcmToken,
//                 notification: {
//                     title: `${senderName} flipped you! 🔄`,
//                     body: generatedContent.substring(0, 100),
//                 },
//                 data: {
//                     senderId: senderUid,
//                     senderName,
//                     content: generatedContent,
//                     type: 'flip',
//                 },
//             };

//             await admin.messaging().send(message);
//         }

//         // STEP 8: Genkit automatically traces and logs all operations
//         // Additional structured logging for business metrics using standard logging
//         console.log('flip_sent_event', {
//             sender_uid: senderUid,
//             recipient_uid: recipientUid,
//             content_length: generatedContent.length,
//             timestamp: new Date().toISOString(),
//         });

//         // Return success
//         return {
//             success: true,
//             message: 'Flip sent successfully',
//             content: generatedContent,
//         };

//     } catch (error) {
//         console.error('Error in sendFlip function:', error);
//         throw new HttpsError('internal', 'Failed to send flip: ' + (error as Error).message);
//     }
// });
