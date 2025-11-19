/**
 * Firestore Conversation History Functions
 *
 * Firebase Functions utilities for loading/saving conversation history.
 * These run server-side and interact with Firestore directly.
 */

import type { ConversationMessage } from '@flip-feeds/shared-logic/utils/conversationHistory';
import { getConversationPath } from '@flip-feeds/shared-logic/utils/conversationHistory';
import * as admin from 'firebase-admin';

/**
 * Load conversation history from Firestore
 */
export async function loadConversationHistory(
  uid: string,
  conversationId: string,
  limit = 20
): Promise<ConversationMessage[]> {
  const db = admin.firestore();
  const messagesPath = getConversationPath(uid, conversationId);

  const snapshot = await db.collection(messagesPath).orderBy('timestamp', 'asc').limit(limit).get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      role: data.role,
      content: data.content,
      timestamp: data.timestamp.toDate(),
      imageUrls: data.imageUrls,
      videoUrls: data.videoUrls,
    } as ConversationMessage;
  });
}

/**
 * Save a message to conversation history
 */
export async function saveMessageToHistory(
  uid: string,
  conversationId: string,
  message: ConversationMessage
): Promise<void> {
  const db = admin.firestore();
  const messagesPath = getConversationPath(uid, conversationId);

  await db.collection(messagesPath).add({
    role: message.role,
    content: message.content,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    imageUrls: message.imageUrls || [],
    videoUrls: message.videoUrls || [],
  });
}

/**
 * Create or update conversation metadata
 */
export async function updateConversationMetadata(
  uid: string,
  conversationId: string,
  metadata: {
    lastMessageAt?: Date;
    messageCount?: number;
    title?: string;
  }
): Promise<void> {
  const db = admin.firestore();
  const conversationPath = `users/${uid}/conversations/${conversationId}`;

  await db.doc(conversationPath).set(
    {
      ...metadata,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Initialize a new conversation
 */
export async function initializeConversation(
  uid: string,
  conversationId: string,
  title?: string
): Promise<void> {
  const db = admin.firestore();
  const conversationPath = `users/${uid}/conversations/${conversationId}`;

  await db.doc(conversationPath).set({
    id: conversationId,
    title: title || 'New Conversation',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    messageCount: 0,
  });
}
