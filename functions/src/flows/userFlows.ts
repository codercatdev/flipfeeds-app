import parseDataURL from 'data-urls';
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import type { Genkit } from 'genkit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { requireAuth } from '../auth/contextProvider';
import { vertexAI } from '../genkit';
import {
    claimUsernameTool,
    createUserProfileTool,
    getUserProfileTool,
    isUsernameAvailableTool,
    releaseUsernameTool,
    UserProfileOutputSchema,
    updateUserProfileTool,
} from '../tools/userTools';

/**
 * Helper function to build public URL for Firebase Storage files with download token
 */
function buildPublicStorageUrl(bucketName: string, filePath: string, token: string): string {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
}

/**
 * Register all user flows with the provided Genkit instance.
 * This function is called from genkit.ts after Genkit is initialized.
 */
export function registerUserFlows(ai: Genkit) {
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
    ai.defineFlow(
        {
            name: 'conversationalProfileFlow',
            metadata: {
                description:
                    'An interactive flow to help users see their profile and set up and customize their profile through conversation.',
            },
            inputSchema: z.object({
                message: z.string().optional().describe('User message or request'),
            }),
            outputSchema: z
                .object({
                    response: z.string().describe('Conversational response to the user'),
                    profile: UserProfileOutputSchema.optional().describe(
                        'Current user profile state'
                    ),
                    needsInput: z.boolean().describe('Whether the flow needs more user input'),
                    suggestedActions: z
                        .array(z.string())
                        .optional()
                        .describe('Suggested next actions for the user'),
                })
                .passthrough(),
        },
        async (input, { context }) => {
            const auth = requireAuth(context);

            // Check if profile exists
            const profile = await getUserProfileTool({}, { auth: context?.auth as any });

            // If no profile exists, create one
            if (!profile) {
                await createUserProfileTool(
                    {
                        displayName: auth.displayName,
                        email: auth.email,
                        photoURL: auth.photoURL,
                    },
                    { auth: context?.auth as any }
                );

                // Fetch the newly created profile
                const newProfile = await getUserProfileTool({}, { auth: context?.auth as any });
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
                        createdAt: newProfile.createdAt,
                        updatedAt: newProfile.updatedAt,
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
                            createdAt: profile.createdAt,
                            updatedAt: profile.updatedAt,
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
                            createdAt: profile.createdAt,
                            updatedAt: profile.updatedAt,
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
                            createdAt: profile.createdAt,
                            updatedAt: profile.updatedAt,
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
                            createdAt: profile.createdAt,
                            updatedAt: profile.updatedAt,
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
                            createdAt: profile.createdAt,
                            updatedAt: profile.updatedAt,
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
                            createdAt: profile.createdAt,
                            updatedAt: profile.updatedAt,
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
                        createdAt: profile.createdAt,
                        updatedAt: profile.updatedAt,
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
                    createdAt: profile.createdAt,
                    updatedAt: profile.updatedAt,
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
    ai.defineFlow(
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
            console.log(
                '[updateProfileFieldFlow] Starting flow with input:',
                JSON.stringify(input)
            );
            console.log('[updateProfileFieldFlow] Context:', JSON.stringify(context, null, 2));

            const auth = requireAuth(context);
            console.log('[updateProfileFieldFlow] Auth user:', auth.uid, auth.email);

            const { field, value } = input;
            console.log('[updateProfileFieldFlow] Field to update:', field, 'Value:', value);

            // Get current profile
            console.log('[updateProfileFieldFlow] Fetching current profile...');
            const profile = await getUserProfileTool({}, { auth: context?.auth as any });
            console.log('[updateProfileFieldFlow] Profile fetched:', profile ? 'exists' : 'null');

            if (!profile) {
                console.log('[updateProfileFieldFlow] Profile not found, returning error');
                return {
                    success: false,
                    message: 'Profile not found. Please create a profile first.',
                };
            }

            console.log(
                '[updateProfileFieldFlow] Current profile data:',
                JSON.stringify(profile, null, 2)
            );

            // Handle username updates with validation
            if (field === 'username') {
                console.log('[updateProfileFieldFlow] Handling username update');

                // Validate username length
                if (value.length < 3 || value.length > 20) {
                    console.log('[updateProfileFieldFlow] Username length invalid:', value.length);
                    return {
                        success: false,
                        message: 'Username must be between 3 and 20 characters.',
                    };
                }

                // Check if username is the same
                if (value === profile.username) {
                    console.log('[updateProfileFieldFlow] Username is already current username');
                    return {
                        success: false,
                        message: 'This is already your username.',
                    };
                }

                // Check availability
                console.log('[updateProfileFieldFlow] Checking username availability...');
                const available = await isUsernameAvailableTool({ username: value });
                console.log('[updateProfileFieldFlow] Username available:', available);

                if (!available) {
                    console.log('[updateProfileFieldFlow] Username already taken');
                    return {
                        success: false,
                        message: `The username "${value}" is already taken. Please try another.`,
                    };
                }

                // Release old username if exists
                if (profile.username) {
                    console.log(
                        '[updateProfileFieldFlow] Releasing old username:',
                        profile.username
                    );
                    await releaseUsernameTool(
                        { username: profile.username },
                        { auth: context?.auth as any }
                    );
                }

                // Claim new username
                console.log('[updateProfileFieldFlow] Claiming new username...');
                const claimed = await claimUsernameTool(
                    { username: value },
                    { auth: context?.auth as any }
                );
                console.log('[updateProfileFieldFlow] Username claimed:', claimed);

                if (!claimed) {
                    console.log('[updateProfileFieldFlow] Failed to claim username');
                    return {
                        success: false,
                        message: 'Failed to claim username. Please try again.',
                    };
                }

                // Update profile
                console.log('[updateProfileFieldFlow] Updating profile in Firestore...');
                await updateUserProfileTool(
                    {
                        updates: { username: value },
                    },
                    { auth: context?.auth as any }
                );

                console.log('[updateProfileFieldFlow] Fetching updated profile...');
                const updatedProfile = await getUserProfileTool({}, { auth: context?.auth as any });
                if (!updatedProfile) {
                    console.error('[updateProfileFieldFlow] Failed to retrieve updated profile');
                    throw new HttpsError('internal', 'Failed to retrieve updated profile');
                }

                console.log('[updateProfileFieldFlow] Username update successful');
                console.log(
                    '[updateProfileFieldFlow] Updated profile:',
                    JSON.stringify(updatedProfile, null, 2)
                );

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
                        createdAt: updatedProfile.createdAt,
                        updatedAt: updatedProfile.updatedAt,
                    },
                };
            }

            // Handle other field updates
            console.log('[updateProfileFieldFlow] Handling other field update for:', field);
            const updates: Record<string, string> = {};
            updates[field] = value;
            console.log('[updateProfileFieldFlow] Updates object:', updates);

            console.log('[updateProfileFieldFlow] Updating profile in Firestore...');
            await updateUserProfileTool(
                {
                    updates,
                },
                { auth: context?.auth as any }
            );

            console.log('[updateProfileFieldFlow] Fetching updated profile...');
            const updatedProfile = await getUserProfileTool({}, { auth: context?.auth as any });
            if (!updatedProfile) {
                console.error('[updateProfileFieldFlow] Failed to retrieve updated profile');
                throw new HttpsError('internal', 'Failed to retrieve updated profile');
            }

            console.log('[updateProfileFieldFlow] Field update successful');
            console.log(
                '[updateProfileFieldFlow] Updated profile:',
                JSON.stringify(updatedProfile, null, 2)
            );

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
                    createdAt: updatedProfile.createdAt,
                    updatedAt: updatedProfile.updatedAt,
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
    ai.defineFlow(
        {
            name: 'profileImageAssistantFlow',
            metadata: {
                description:
                    'A flow to assist users in setting up their profile image through AI generation or direct URL.',
            },
            inputSchema: z.object({
                action: z
                    .enum(['provide_url', 'generate_images', 'select_image', 'remove'])
                    .describe('The action to take with the profile image'),
                imageUrl: z
                    .string()
                    .url()
                    .optional()
                    .describe('Image URL for provide_url or select_image actions'),
                prompt: z
                    .string()
                    .optional()
                    .describe(
                        'Description for AI image generation (e.g., "a professional avatar")'
                    ),
                selectedImageIndex: z
                    .number()
                    .optional()
                    .describe('Index (0-2) of the selected image from generated images'),
            }),
            outputSchema: z
                .object({
                    success: z.boolean(),
                    message: z.string(),
                    imageUrl: z.string().optional().describe('The profile image URL if set'),
                    imageUrls: z
                        .array(
                            z.object({
                                url: z.string().url(),
                                index: z.number(),
                                description: z.string(),
                            })
                        )
                        .optional()
                        .describe('Generated image URLs for user selection'),
                    imageCount: z.number().optional(),
                })
                .passthrough(),
        },
        async (input, { context }) => {
            const auth = requireAuth(context);
            const { action, imageUrl, selectedImageIndex } = input;

            // Get current profile
            const profile = await getUserProfileTool({}, { auth: context?.auth as any });
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

                    try {
                        // Initialize Firebase Storage
                        const storage = admin.storage();
                        const bucket = storage.bucket();

                        // Fetch and store the provided image URL
                        const imageResponse = await fetch(imageUrl);
                        if (!imageResponse.ok) {
                            throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
                        }
                        const imageBuffer = await imageResponse.arrayBuffer();

                        // Create a unique file path in the uploaded folder
                        const timestamp = Date.now();
                        const fileName = `profile-images/${auth.uid}/uploaded/profile-${timestamp}.jpg`;
                        const file = bucket.file(fileName);

                        // Upload to Firebase Storage
                        await file.save(Buffer.from(imageBuffer), {
                            metadata: {
                                contentType: 'image/jpeg',
                                metadata: {
                                    uid: auth.uid,
                                    uploadedAt: new Date().toISOString(),
                                    sourceUrl: imageUrl,
                                },
                            },
                            public: true,
                        });

                        // Get the public URL
                        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

                        console.log(`User-provided image stored to ${fileName}`);

                        // Update profile with the stored image URL
                        await updateUserProfileTool(
                            {
                                updates: { photoURL: publicUrl },
                            },
                            { auth: context?.auth as any }
                        );

                        return {
                            success: true,
                            message: 'Successfully updated your profile image!',
                            imageUrl: publicUrl,
                        };
                    } catch (error) {
                        const errorMessage =
                            error instanceof Error ? error.message : 'Unknown error';
                        console.error('Error storing provided image:', errorMessage);
                        return {
                            success: false,
                            message: `Failed to store provided image: ${errorMessage}`,
                        };
                    }

                case 'generate_images': {
                    const userPrompt =
                        input.prompt ||
                        `A professional avatar for ${profile.displayName || 'user'}`;

                    try {
                        // Generate three images in parallel
                        // Adding slight variations to ensure diversity
                        const prompts = [
                            userPrompt,
                            `${userPrompt}, variation 2`,
                            `${userPrompt}, variation 3`,
                        ];

                        console.log(`Generating ${prompts.length} images in parallel...`);

                        const imagePromises = prompts.map(async (prompt, index) => {
                            console.log(`Starting generation for image ${index + 1}`);
                            const response = await ai.generate({
                                model: vertexAI.model('imagen-3.0-fast-generate-001'),
                                prompt: prompt,
                                output: { format: 'media' },
                                config: {
                                    aspectRatio: '1:1', // Square image for profile
                                    outputOptions: {
                                        mimeType: 'image/jpeg', // JPEG is more compact than PNG
                                        compressionQuality: 80, // Good quality but smaller size
                                    },
                                },
                            });

                            if (!response.media?.url) {
                                throw new Error(`Failed to generate image ${index + 1}`);
                            }

                            console.log(`Successfully generated image ${index + 1}`);
                            return { mediaUrl: response.media.url, index };
                        });

                        const results = await Promise.all(imagePromises);
                        console.log(
                            `All ${results.length} images generated, storing to Firebase Storage...`
                        );

                        // Initialize Firebase Storage
                        const storage = admin.storage();
                        const bucket = storage.bucket();

                        // Store each generated image to Firebase Storage and get public URLs
                        const uploadPromises = results.map(async ({ mediaUrl, index }) => {
                            if (!mediaUrl) {
                                throw new Error(`Failed to get image ${index + 1} URL`);
                            }

                            // Parse the data URL
                            const parsed = parseDataURL(mediaUrl);
                            if (!parsed) {
                                throw new Error(
                                    `Failed to parse image data URL for image ${index + 1}`
                                );
                            }

                            // Create unique file path in generated folder
                            const timestamp = Date.now();
                            const fileName = `profile-images/${auth.uid}/generated/ai-avatar-${timestamp}-${index}.jpg`;
                            const file = bucket.file(fileName);

                            // Generate a download token for public access (works in emulator and production)
                            const downloadToken = uuidv4();

                            // Upload to Firebase Storage with download token
                            await file.save(Buffer.from(parsed.body), {
                                metadata: {
                                    contentType: 'image/jpeg',
                                    metadata: {
                                        uid: auth.uid,
                                        generatedAt: new Date().toISOString(),
                                        prompt: userPrompt,
                                        variation: index + 1,
                                        firebaseStorageDownloadTokens: downloadToken,
                                    },
                                },
                            });

                            // Build public URL
                            const publicUrl = buildPublicStorageUrl(
                                bucket.name,
                                fileName,
                                downloadToken
                            );

                            // Also convert to base64 for MCP display (Claude needs this to show images)
                            const base64Data = Buffer.from(parsed.body).toString('base64');

                            console.log(
                                `Stored image ${index + 1} to ${fileName} with URL: ${publicUrl}`
                            );

                            return {
                                url: publicUrl,
                                base64: base64Data,
                                index,
                                fileName,
                            };
                        });

                        const uploadedImages = await Promise.all(uploadPromises);
                        console.log(
                            `Successfully stored ${uploadedImages.length} images to Firebase Storage`
                        );

                        // Format response with URLs and base64 data for display
                        const imageUrls = uploadedImages.map(({ url, base64, index }) => ({
                            url,
                            base64,
                            index,
                            description: `Variation ${index + 1} of: ${userPrompt}`,
                        }));

                        return {
                            success: true,
                            message: `✅ Generated ${imageUrls.length} profile images!

To select an image, call this flow again with:
- action: "select_image"  
- imageUrl: (paste the URL of your chosen image)`,
                            imageUrls,
                            imageCount: imageUrls.length,
                        };
                    } catch (error) {
                        const errorMessage =
                            error instanceof Error ? error.message : 'Unknown error';
                        console.error('Error generating images:', errorMessage);
                        return {
                            success: false,
                            message: `Failed to generate images: ${errorMessage}`,
                        };
                    }
                }

                case 'select_image': {
                    if (!imageUrl) {
                        return {
                            success: false,
                            message: 'Please provide imageUrl of the selected image.',
                        };
                    }

                    if (
                        selectedImageIndex !== undefined &&
                        (selectedImageIndex < 0 || selectedImageIndex > 2)
                    ) {
                        return {
                            success: false,
                            message: 'selectedImageIndex must be between 0 and 2.',
                        };
                    }

                    try {
                        // Initialize Firebase Storage
                        const storage = admin.storage();
                        const bucket = storage.bucket();

                        // Fetch the image from the provided URL
                        const imageResponse = await fetch(imageUrl);
                        if (!imageResponse.ok) {
                            throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
                        }
                        const imageBuffer = await imageResponse.arrayBuffer();

                        // Create a unique file path in the selected folder
                        const timestamp = Date.now();
                        const fileName = `profile-images/${auth.uid}/selected/profile-${timestamp}.jpg`;
                        const file = bucket.file(fileName);

                        // Generate a download token for public access
                        const downloadToken = uuidv4();

                        // Upload to Firebase Storage with download token
                        await file.save(Buffer.from(imageBuffer), {
                            metadata: {
                                contentType: 'image/jpeg',
                                metadata: {
                                    uid: auth.uid,
                                    selectedAt: new Date().toISOString(),
                                    sourceUrl: imageUrl,
                                    firebaseStorageDownloadTokens: downloadToken,
                                },
                            },
                        });

                        // Build public URL (emulator-aware)
                        const publicUrl = buildPublicStorageUrl(
                            bucket.name,
                            fileName,
                            downloadToken
                        );

                        console.log(`Selected image stored to ${fileName} with URL: ${publicUrl}`);

                        // Update user profile with the public URL
                        await updateUserProfileTool(
                            {
                                updates: { photoURL: publicUrl },
                            },
                            { auth: context?.auth as any }
                        );

                        return {
                            success: true,
                            message: 'Successfully updated your profile image!',
                            imageUrl: publicUrl,
                        };
                    } catch (error) {
                        const errorMessage =
                            error instanceof Error ? error.message : 'Unknown error';
                        console.error('Error selecting and storing image:', errorMessage);
                        return {
                            success: false,
                            message: `Failed to store and update profile image: ${errorMessage}`,
                        };
                    }
                }

                case 'remove':
                    await updateUserProfileTool(
                        {
                            updates: { photoURL: undefined },
                        },
                        { auth: context?.auth as any }
                    );

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
}
