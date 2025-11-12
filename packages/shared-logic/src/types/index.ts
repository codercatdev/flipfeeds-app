/**
 * User Profile type
 */
export interface UserProfile {
    uid: string;
    displayName?: string;
    username?: string;
    photoURL?: string;
    bio?: string;
    phoneNumber?: string;
    email?: string;
    feedCount: number;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Feed type
 */
export interface Feed {
    id: string;
    name: string;
    description?: string;
    logoURL?: string;
    visibility: 'public' | 'private' | 'personal';
    ownerId: string;
    tags: string[];
    stats: {
        memberCount: number;
        flipCount: number;
    };
    createdAt: Date;
    updatedAt: Date;
    // Optional fields when user context is available
    userRole?: 'admin' | 'moderator' | 'member';
}

/**
 * Feed Member type
 */
export interface FeedMember {
    userId: string;
    displayName?: string;
    photoURL?: string;
    role: 'admin' | 'moderator' | 'member';
    joinedAt: Date;
}

/**
 * Flip (video content) type
 */
export interface Flip {
    id: string;
    feedId: string;
    authorId: string;
    authorName?: string;
    authorPhotoURL?: string;
    title: string;
    aiSummary?: string;
    videoURL: string;
    thumbnailURL?: string;
    gcsUri?: string;
    tags: string[];
    stats: {
        likeCount: number;
        commentCount: number;
        viewCount: number;
    };
    moderation: {
        isSafe: boolean;
        flags: string[];
    };
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Flip Comment type
 */
export interface FlipComment {
    id: string;
    flipId: string;
    authorId: string;
    authorName?: string;
    authorPhotoURL?: string;
    text: string;
    createdAt: Date;
}

/**
 * Flip Link type
 */
export interface FlipLink {
    linkId: string;
    feedId: string;
    feedName: string;
    shortUrl: string;
    deepLink: string;
    expiresAt: Date;
    singleUse: boolean;
    used: boolean;
    stats: {
        viewCount: number;
        redeemCount: number;
    };
    createdAt: Date;
}

/**
 * Invite type (for private Feeds)
 */
export interface Invite {
    inviteId: string;
    feedId: string;
    feedName: string;
    inviteUrl: string;
    expiresAt: Date;
    consumed: boolean;
    createdAt: Date;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
    items: T[];
    meta: PaginationMeta;
}
