import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { ai } from '../genkit';
import {
    claimUsernameTool,
    createUserProfileTool,
    getUserProfileTool,
    isUsernameAvailableTool,
    releaseUsernameTool,
    updateUserProfileTool,
} from '../tools/userTools';

// Input schemas
const CreateUserInputSchema = z.object({
    uid: z.string(),
    displayName: z.string().optional(),
    photoURL: z.string().url().optional(),
    phoneNumber: z.string().optional(),
    email: z.string().email().optional(),
});

const UpdateUserProfileInputSchema = z.object({
    uid: z.string(),
    displayName: z.string().optional(),
    username: z.string().optional(),
    bio: z.string().optional(),
    photoURL: z.string().url().optional(),
});

const CheckUsernameInputSchema = z.object({
    username: z.string().min(3).max(20),
});

// Output schemas
const UserProfileOutputSchema = z.object({
    uid: z.string(),
    displayName: z.string().optional(),
    username: z.string().optional(),
    photoURL: z.string().url().optional(),
    bio: z.string().optional(),
    feedCount: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

const CheckUsernameOutputSchema = z.object({
    available: z.boolean(),
    username: z.string(),
});

/**
 * Create user profile on signup
 * Called by auth triggers or client after Firebase Auth signup
 */
export const createUserFlow = ai.defineFlow(
    {
        name: 'createUserFlow',
        inputSchema: CreateUserInputSchema,
        outputSchema: UserProfileOutputSchema,
    },
    async (input: z.infer<typeof CreateUserInputSchema>) => {
        await createUserProfileTool(input);

        const profile = await getUserProfileTool({ uid: input.uid });
        if (!profile) {
            throw new HttpsError('internal', 'Failed to create user profile');
        }

        return {
            uid: profile.uid,
            displayName: profile.displayName,
            username: profile.username,
            photoURL: profile.photoURL,
            bio: profile.bio,
            feedCount: profile.feedCount,
            createdAt: profile.createdAt.toISOString(),
            updatedAt: profile.updatedAt.toISOString(),
        };
    }
);

/**
 * Update user profile with username uniqueness enforcement
 */
export const updateUserProfileFlow = ai.defineFlow(
    {
        name: 'updateUserProfileFlow',
        inputSchema: UpdateUserProfileInputSchema,
        outputSchema: UserProfileOutputSchema,
    },
    async (input: z.infer<typeof UpdateUserProfileInputSchema>) => {
        const { uid, username, ...otherUpdates } = input;

        // Get current profile
        const currentProfile = await getUserProfileTool({ uid });
        if (!currentProfile) {
            throw new HttpsError('not-found', 'User profile not found');
        }

        // Handle username change
        if (username && username !== currentProfile.username) {
            // Check availability
            const available = await isUsernameAvailableTool({ username });
            if (!available) {
                throw new HttpsError('already-exists', 'Username is already taken');
            }

            // Release old username if exists
            if (currentProfile.username) {
                await releaseUsernameTool({ username: currentProfile.username });
            }

            // Claim new username
            const claimed = await claimUsernameTool({ uid, username });
            if (!claimed) {
                throw new HttpsError('already-exists', 'Failed to claim username');
            }
        }

        // Update profile
        await updateUserProfileTool({
            uid,
            updates: {
                ...otherUpdates,
                username,
            },
        });

        const updatedProfile = await getUserProfileTool({ uid });
        if (!updatedProfile) {
            throw new HttpsError('internal', 'Failed to retrieve updated profile');
        }

        return {
            uid: updatedProfile.uid,
            displayName: updatedProfile.displayName,
            username: updatedProfile.username,
            photoURL: updatedProfile.photoURL,
            bio: updatedProfile.bio,
            feedCount: updatedProfile.feedCount,
            createdAt: updatedProfile.createdAt.toISOString(),
            updatedAt: updatedProfile.updatedAt.toISOString(),
        };
    }
);

/**
 * Check if username is available
 */
export const checkUsernameFlow = ai.defineFlow(
    {
        name: 'checkUsernameFlow',
        inputSchema: CheckUsernameInputSchema,
        outputSchema: CheckUsernameOutputSchema,
    },
    async (input: z.infer<typeof CheckUsernameInputSchema>) => {
        const available = await isUsernameAvailableTool({ username: input.username });
        return {
            available,
            username: input.username,
        };
    }
);

/**
 * Get user profile
 */
export const getUserProfileFlow = ai.defineFlow(
    {
        name: 'getUserProfileFlow',
        inputSchema: z.object({ uid: z.string() }),
        outputSchema: UserProfileOutputSchema,
    },
    async (input: { uid: string }) => {
        const profile = await getUserProfileTool({ uid: input.uid });
        if (!profile) {
            throw new HttpsError('not-found', 'User profile not found');
        }

        return {
            uid: profile.uid,
            displayName: profile.displayName,
            username: profile.username,
            photoURL: profile.photoURL,
            bio: profile.bio,
            feedCount: profile.feedCount,
            createdAt: profile.createdAt.toISOString(),
            updatedAt: profile.updatedAt.toISOString(),
        };
    }
);
