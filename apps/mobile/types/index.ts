// FlipFeeds Type Definitions

export interface User {
    uid: string;
    username?: string; // Unique handle like @username (optional until onboarding complete)
    displayName: string;
    email: string;
    photoURL?: string;
    fcmToken?: string;
    createdAt: number;
    hasCompletedOnboarding?: boolean; // True once username is set
    usernameLastChanged?: number; // Timestamp of last username change (for 7-day cooldown)
}

export interface UsernameChange {
    oldUsername: string | null;
    newUsername: string;
    timestamp: number;
}

export interface Friendship {
    id: string;
    users: [string, string]; // Two user UIDs
    status: 'pending' | 'accepted';
    requesterId: string;
    createdAt: number;
    updatedAt: number;
}

export interface FlipStreak {
    count: number;
    lastFlipTimestamp: number;
}

export interface FlipMessage {
    id: string;
    senderId: string;
    recipientId: string;
    content: string;
    createdAt: number;
    read: boolean;
}

// Helper function to create a composite key for flip streaks
export const createStreakKey = (uid1: string, uid2: string): string => {
    return [uid1, uid2].sort().join('_');
};
