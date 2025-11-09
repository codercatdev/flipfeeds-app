// FlipFeeds Type Definitions

export interface User {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    fcmToken?: string;
    createdAt: number;
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
