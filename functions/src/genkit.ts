import { type CallableOptions, onCallGenkit } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';

const googleAIapiKey = defineSecret('GEMINI_API_KEY');
const genKitGoogleAiOptions: CallableOptions = {
    secrets: [googleAIapiKey],
    enforceAppCheck: false,
    // Optional. Makes App Check tokens only usable once. This adds extra security
    // at the expense of slowing down your app to generate a token for every API
    // call
    consumeAppCheckToken: false,
    // authPolicy: (auth) => auth?.token?.email_verified || false,
};

import { generateFlipFlow } from './flows/generateFlip';
// Import flows
import { generatePoemFlow } from './flows/generatePoemFlow';

export const generatePoem = onCallGenkit(genKitGoogleAiOptions, generatePoemFlow());
export const generateFlip = onCallGenkit(genKitGoogleAiOptions, generateFlipFlow());
