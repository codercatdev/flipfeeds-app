import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { requireAuth } from '../auth/contextProvider';
import { ai } from '../genkit';
import {
    claimUsernameTool,
    createUserProfileTool,
    getUserProfileTool,
    isUsernameAvailableTool,
    releaseUsernameTool,
    updateUserProfileTool,
} from '../tools/userTools';

// Output schemas
const UserProfileOutputSchema = z.object({
    uid: z.string(),
    displayName: z.string().optional(),
    username: z.string().optional(),
    photoURL: z.string().url().optional(),
    bio: z.string().optional(),
    feedCount: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
});

/**
 * Conversational User Profile Flow
 *
 * This flow provides an interactive conversation to help users:
 * 1. Check authentication
 * 2. Check if profile exists, create if missing
 * 3. Optionally customize their profile (username, bio)
 * 4. Optionally generate or find a profile image
 *
 * Uses available tools: getUserProfileTool, createUserProfileTool,
 * updateUserProfileTool, isUsernameAvailableTool, claimUsernameTool
 */
export const conversationalProfileFlow = ai.defineFlow(
    {
        name: 'conversationalProfileFlow',
        metadata: {
            description:
                'An interactive flow to help users see their profile and set up and customize their profile through conversation.',
        },
        inputSchema: z.object({
            message: z.string().optional().describe('User message or request'),
        }),
        outputSchema: z.object({
            response: z.string().describe('Conversational response to the user'),
            profile: UserProfileOutputSchema.optional().describe('Current user profile state'),
            needsInput: z.boolean().describe('Whether the flow needs more user input'),
            suggestedActions: z
                .array(z.string())
                .optional()
                .describe('Suggested next actions for the user'),
        }),
    },
    async (input, { context }) => {
        const auth = requireAuth(context);

        // Check if profile exists
        const profile = await getUserProfileTool({ uid: auth.uid });

        // If no profile exists, create one
        if (!profile) {
            await createUserProfileTool({
                uid: auth.uid,
                displayName: auth.displayName,
                email: auth.email,
                photoURL: auth.photoURL,
            });

            // Fetch the newly created profile
            const newProfile = await getUserProfileTool({ uid: auth.uid });
            if (!newProfile) {
                throw new HttpsError('internal', 'Failed to create user profile');
            }

            return {
                response: `Welcome! I've created your profile. Your profile is set up with the display name "${auth.displayName || 'User'}". Would you like to customize it further? You can:
- Choose a unique username
- Add a bio to tell others about yourself
- Generate or find a profile image`,
                profile: {
                    uid: newProfile.uid,
                    displayName: newProfile.displayName,
                    username: newProfile.username,
                    photoURL: newProfile.photoURL,
                    bio: newProfile.bio,
                    feedCount: newProfile.feedCount,
                    createdAt: newProfile.createdAt.toISOString(),
                    updatedAt: newProfile.updatedAt.toISOString(),
                },
                needsInput: true,
                suggestedActions: [
                    'Set a username',
                    'Add a bio',
                    'Generate a profile image',
                    'Skip customization',
                ],
            };
        }

        // Profile exists - handle conversational requests
        const userMessage = input.message?.toLowerCase() || '';

        // Handle username requests
        if (userMessage.includes('username')) {
            if (!profile.username) {
                return {
                    response:
                        "You don't have a username set yet. Usernames must be 3-20 characters and unique. What username would you like?",
                    profile: {
                        uid: profile.uid,
                        displayName: profile.displayName,
                        username: profile.username,
                        photoURL: profile.photoURL,
                        bio: profile.bio,
                        feedCount: profile.feedCount,
                        createdAt: profile.createdAt.toISOString(),
                        updatedAt: profile.updatedAt.toISOString(),
                    },
                    needsInput: true,
                    suggestedActions: ['Enter a username'],
                };
            } else {
                return {
                    response: `Your current username is "${profile.username}". Would you like to change it?`,
                    profile: {
                        uid: profile.uid,
                        displayName: profile.displayName,
                        username: profile.username,
                        photoURL: profile.photoURL,
                        bio: profile.bio,
                        feedCount: profile.feedCount,
                        createdAt: profile.createdAt.toISOString(),
                        updatedAt: profile.updatedAt.toISOString(),
                    },
                    needsInput: true,
                    suggestedActions: ['Enter a new username', 'Keep current username'],
                };
            }
        }

        // Handle bio requests
        if (userMessage.includes('bio')) {
            if (!profile.bio) {
                return {
                    response: "You don't have a bio yet. Tell me about yourself!",
                    profile: {
                        uid: profile.uid,
                        displayName: profile.displayName,
                        username: profile.username,
                        photoURL: profile.photoURL,
                        bio: profile.bio,
                        feedCount: profile.feedCount,
                        createdAt: profile.createdAt.toISOString(),
                        updatedAt: profile.updatedAt.toISOString(),
                    },
                    needsInput: true,
                    suggestedActions: ['Enter your bio'],
                };
            } else {
                return {
                    response: `Your current bio: "${profile.bio}". Would you like to update it?`,
                    profile: {
                        uid: profile.uid,
                        displayName: profile.displayName,
                        username: profile.username,
                        photoURL: profile.photoURL,
                        bio: profile.bio,
                        feedCount: profile.feedCount,
                        createdAt: profile.createdAt.toISOString(),
                        updatedAt: profile.updatedAt.toISOString(),
                    },
                    needsInput: true,
                    suggestedActions: ['Enter a new bio', 'Keep current bio'],
                };
            }
        }

        // Handle profile image requests
        if (
            userMessage.includes('image') ||
            userMessage.includes('photo') ||
            userMessage.includes('picture') ||
            userMessage.includes('avatar')
        ) {
            if (!profile.photoURL) {
                return {
                    response:
                        "You don't have a profile image yet. I can help you:\n1. Generate an AI image based on your interests\n2. Find an image from the web\n3. Use a URL you provide\n\nWhat would you like to do?",
                    profile: {
                        uid: profile.uid,
                        displayName: profile.displayName,
                        username: profile.username,
                        photoURL: profile.photoURL,
                        bio: profile.bio,
                        feedCount: profile.feedCount,
                        createdAt: profile.createdAt.toISOString(),
                        updatedAt: profile.updatedAt.toISOString(),
                    },
                    needsInput: true,
                    suggestedActions: [
                        'Generate AI image',
                        'Find image on web',
                        'Provide image URL',
                    ],
                };
            } else {
                return {
                    response: `Your current profile image: ${profile.photoURL}\n\nWould you like to change it?`,
                    profile: {
                        uid: profile.uid,
                        displayName: profile.displayName,
                        username: profile.username,
                        photoURL: profile.photoURL,
                        bio: profile.bio,
                        feedCount: profile.feedCount,
                        createdAt: profile.createdAt.toISOString(),
                        updatedAt: profile.updatedAt.toISOString(),
                    },
                    needsInput: true,
                    suggestedActions: [
                        'Generate new AI image',
                        'Find new image',
                        'Keep current image',
                    ],
                };
            }
        }

        // Default response - show profile status
        const missingFields = [];
        if (!profile.username) missingFields.push('username');
        if (!profile.bio) missingFields.push('bio');
        if (!profile.photoURL) missingFields.push('profile image');

        if (missingFields.length > 0) {
            return {
                response: `Your profile is partially complete. You're missing: ${missingFields.join(', ')}. What would you like to set up first?`,
                profile: {
                    uid: profile.uid,
                    displayName: profile.displayName,
                    username: profile.username,
                    photoURL: profile.photoURL,
                    bio: profile.bio,
                    feedCount: profile.feedCount,
                    createdAt: profile.createdAt.toISOString(),
                    updatedAt: profile.updatedAt.toISOString(),
                },
                needsInput: true,
                suggestedActions: missingFields.map((field) => `Set ${field}`),
            };
        }

        return {
            response: `Your profile is complete! 
Username: ${profile.username}
Bio: ${profile.bio}
Photo: ${profile.photoURL ? 'Set' : 'Not set'}
Feeds: ${profile.feedCount}

Would you like to update anything?`,
            profile: {
                uid: profile.uid,
                displayName: profile.displayName,
                username: profile.username,
                photoURL: profile.photoURL,
                bio: profile.bio,
                feedCount: profile.feedCount,
                createdAt: profile.createdAt.toISOString(),
                updatedAt: profile.updatedAt.toISOString(),
            },
            needsInput: false,
            suggestedActions: ['Update username', 'Update bio', 'Change profile image'],
        };
    }
);

/**
 * Update Profile Field Flow
 *
 * This flow handles specific profile field updates through conversation.
 * It validates inputs (like username availability) and provides helpful feedback.
 */
export const updateProfileFieldFlow = ai.defineFlow(
    {
        name: 'updateProfileFieldFlow',
        metadata: {
            description:
                'A flow to update specific user profile fields with validation and feedback.',
        },
        inputSchema: z.object({
            field: z
                .enum(['username', 'bio', 'photoURL', 'displayName'])
                .describe('The field to update'),
            value: z.string().describe('The new value for the field'),
        }),
        outputSchema: z.object({
            success: z.boolean(),
            message: z.string(),
            profile: UserProfileOutputSchema.optional(),
        }),
    },
    async (input, { context }) => {
        const auth = requireAuth(context);
        const { field, value } = input;

        // Get current profile
        const profile = await getUserProfileTool({ uid: auth.uid });
        if (!profile) {
            return {
                success: false,
                message: 'Profile not found. Please create a profile first.',
            };
        }

        // Handle username updates with validation
        if (field === 'username') {
            // Validate username length
            if (value.length < 3 || value.length > 20) {
                return {
                    success: false,
                    message: 'Username must be between 3 and 20 characters.',
                };
            }

            // Check if username is the same
            if (value === profile.username) {
                return {
                    success: false,
                    message: 'This is already your username.',
                };
            }

            // Check availability
            const available = await isUsernameAvailableTool({ username: value });
            if (!available) {
                return {
                    success: false,
                    message: `The username "${value}" is already taken. Please try another.`,
                };
            }

            // Release old username if exists
            if (profile.username) {
                await releaseUsernameTool({ username: profile.username });
            }

            // Claim new username
            const claimed = await claimUsernameTool({ uid: auth.uid, username: value });
            if (!claimed) {
                return {
                    success: false,
                    message: 'Failed to claim username. Please try again.',
                };
            }

            // Update profile
            await updateUserProfileTool({
                uid: auth.uid,
                updates: { username: value },
            });

            const updatedProfile = await getUserProfileTool({ uid: auth.uid });
            if (!updatedProfile) {
                throw new HttpsError('internal', 'Failed to retrieve updated profile');
            }

            return {
                success: true,
                message: `Successfully updated your username to "${value}"!`,
                profile: {
                    uid: updatedProfile.uid,
                    displayName: updatedProfile.displayName,
                    username: updatedProfile.username,
                    photoURL: updatedProfile.photoURL,
                    bio: updatedProfile.bio,
                    feedCount: updatedProfile.feedCount,
                    createdAt: updatedProfile.createdAt.toISOString(),
                    updatedAt: updatedProfile.updatedAt.toISOString(),
                },
            };
        }

        // Handle other field updates
        const updates: Record<string, string> = {};
        updates[field] = value;

        await updateUserProfileTool({
            uid: auth.uid,
            updates,
        });

        const updatedProfile = await getUserProfileTool({ uid: auth.uid });
        if (!updatedProfile) {
            throw new HttpsError('internal', 'Failed to retrieve updated profile');
        }

        return {
            success: true,
            message: `Successfully updated your ${field}!`,
            profile: {
                uid: updatedProfile.uid,
                displayName: updatedProfile.displayName,
                username: updatedProfile.username,
                photoURL: updatedProfile.photoURL,
                bio: updatedProfile.bio,
                feedCount: updatedProfile.feedCount,
                createdAt: updatedProfile.createdAt.toISOString(),
                updatedAt: updatedProfile.updatedAt.toISOString(),
            },
        };
    }
);

/**
 * Profile Image Assistant Flow
 *
 * This flow helps users set up their profile image by:
 * 1. Accepting a direct image URL
 * 2. Providing guidance on generating AI images (via external tools)
 * 3. Suggesting image search strategies
 *
 * Note: Actual image generation would require additional tools/services
 */
export const profileImageAssistantFlow = ai.defineFlow(
    {
        name: 'profileImageAssistantFlow',
        metadata: {
            description:
                'A flow to assist users in setting up their profile image through various methods.',
        },
        inputSchema: z.object({
            action: z
                .enum(['provide_url', 'generate_guidance', 'search_guidance', 'remove'])
                .describe('The action to take with the profile image'),
            imageUrl: z.string().url().optional().describe('Image URL if action is provide_url'),
            prompt: z.string().optional().describe('Description for AI image generation guidance'),
        }),
        outputSchema: z.object({
            success: z.boolean(),
            message: z.string(),
            imageUrl: z.string().optional().describe('The profile image URL if set'),
            guidance: z.string().optional().describe('Additional guidance or suggestions'),
        }),
    },
    async (input, { context }) => {
        const auth = requireAuth(context);
        const { action, imageUrl, prompt } = input;

        // Get current profile
        const profile = await getUserProfileTool({ uid: auth.uid });
        if (!profile) {
            return {
                success: false,
                message: 'Profile not found. Please create a profile first.',
            };
        }

        switch (action) {
            case 'provide_url':
                if (!imageUrl) {
                    return {
                        success: false,
                        message: 'Please provide an image URL.',
                    };
                }

                // Update profile with the image URL
                await updateUserProfileTool({
                    uid: auth.uid,
                    updates: { photoURL: imageUrl },
                });

                return {
                    success: true,
                    message: 'Successfully updated your profile image!',
                    imageUrl: imageUrl,
                };

            case 'generate_guidance': {
                const aiPrompt = prompt || 'a professional avatar based on your interests';
                return {
                    success: true,
                    message: `To generate an AI image for your profile, you can use these services:
                    
1. **DALL-E (OpenAI)**: Create unique, AI-generated images
   - Visit: https://labs.openai.com
   - Prompt: "${aiPrompt}"
   
2. **Midjourney**: High-quality AI art generation
   - Discord-based: https://midjourney.com
   
3. **Stable Diffusion**: Free, open-source option
   - Visit: https://stablediffusionweb.com
   
4. **Gemini Image Generation**: Google's AI image tool
   - Use Google AI Studio: https://aistudio.google.com

After generating your image, come back and use the 'provide_url' action to set it as your profile image!`,
                    guidance:
                        'Once you have your image URL, call this flow again with action: "provide_url" and your imageUrl.',
                };
            }

            case 'search_guidance':
                return {
                    success: true,
                    message: `Here are some great places to find profile images:

1. **Unsplash** (Free, high-quality): https://unsplash.com
   - Search for: avatars, portraits, professional headshots
   
2. **Pexels** (Free): https://pexels.com
   - Great for professional photos
   
3. **Gravatar**: Use your email-based Gravatar
   - Visit: https://gravatar.com
   
4. **UI Avatars** (Generated): https://ui-avatars.com
   - Auto-generates based on your name

Remember to:
- Use images you have rights to
- Choose appropriate, professional images
- Use square images for best results (recommended: 400x400px or larger)

After finding your image, come back with the URL to set it as your profile image!`,
                    guidance:
                        'Once you have your image URL, call this flow again with action: "provide_url" and your imageUrl.',
                };

            case 'remove':
                await updateUserProfileTool({
                    uid: auth.uid,
                    updates: { photoURL: undefined },
                });

                return {
                    success: true,
                    message: 'Profile image removed successfully.',
                };

            default:
                return {
                    success: false,
                    message: 'Invalid action specified.',
                };
        }
    }
);
