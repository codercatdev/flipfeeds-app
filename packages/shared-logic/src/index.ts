/**
 * Shared Logic Package
 *
 * This package contains business logic, custom hooks, and utilities
 * that are shared between the web and mobile applications.
 */

// Export hooks
export { useAuth } from './hooks/useAuth';

// Export conversation history utilities
export {
  buildMultimodalPrompt,
  type ConversationHistoryOptions,
  type ConversationMessage,
  estimateTokens,
  formatHistoryForPrompt,
  getConversationPath,
} from './utils/conversationHistory';
