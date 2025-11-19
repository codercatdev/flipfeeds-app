/**
 * Conversation History Utilities
 *
 * Shared utilities for managing conversation history in Firestore.
 * Used by both Firebase Functions (flows) and client apps.
 */

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  imageUrls?: string[];
  videoUrls?: string[];
}

export interface ConversationHistoryOptions {
  maxMessages?: number;
  maxTokens?: number;
}

/**
 * Build Firestore path for conversation messages
 */
export function getConversationPath(uid: string, conversationId: string): string {
  return `users/${uid}/conversations/${conversationId}/messages`;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Format conversation history for inclusion in LLM prompts
 */
export function formatHistoryForPrompt(
  messages: ConversationMessage[],
  options: ConversationHistoryOptions = {}
): string {
  const { maxMessages = 10, maxTokens = 4096 } = options;

  // Take only the most recent messages
  const recentMessages = messages.slice(-maxMessages);

  let totalTokens = 0;
  const formattedMessages: string[] = [];

  // Build from most recent backwards to stay within token limit
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
    const messageText = `${msg.role}: ${msg.content}`;
    const tokens = estimateTokens(messageText);

    if (totalTokens + tokens > maxTokens) {
      break;
    }

    formattedMessages.unshift(messageText);
    totalTokens += tokens;
  }

  return formattedMessages.length > 0
    ? `\n\nConversation History:\n${formattedMessages.join('\n')}`
    : '';
}

/**
 * Build multimodal prompt from message content and media URLs
 * Returns either a simple string or a string with media context for Gemini.
 *
 * Note: For proper multimodal support, images/videos should be uploaded to
 * Cloud Storage and referenced by URI in the prompt text.
 */
export function buildMultimodalPrompt(
  text: string,
  imageUrls?: string[],
  videoUrls?: string[]
): string {
  let prompt = text;

  // Add context about attached media
  if (imageUrls && imageUrls.length > 0) {
    prompt += `\n\n[User has attached ${imageUrls.length} image(s): ${imageUrls.join(', ')}]`;
  }

  if (videoUrls && videoUrls.length > 0) {
    prompt += `\n\n[User has attached ${videoUrls.length} video(s): ${videoUrls.join(', ')}]`;
  }

  return prompt;
}
