import { useCallback, useEffect, useReducer } from "react";
import { aiService } from "../services/aiService";
import type { ChatMessage } from "../services/aiService";

/**
 * Chat state
 */
export interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
}

/**
 * Chat actions
 */
type ChatAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_MESSAGES"; payload: ChatMessage[] }
  | { type: "ADD_USER_MESSAGE"; payload: string }
  | { type: "ADD_AI_MESSAGE"; payload: string }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR_MESSAGES" };

/**
 * Reducer for managing chat state
 */
const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_MESSAGES":
      return { ...state, messages: action.payload, error: null };

    case "ADD_USER_MESSAGE":
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            sender: "User",
            message: action.payload,
            timestamp: new Date().toISOString(),
          },
        ],
      };

    case "ADD_AI_MESSAGE":
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            sender: "AI",
            message: action.payload,
            timestamp: new Date().toISOString(),
          },
        ],
      };

    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };

    case "CLEAR_MESSAGES":
      return { ...state, messages: [] };

    default:
      return state;
  }
};

/**
 * useChat Hook
 * Manages AI chat state and operations
 *
 * Features:
 * - Optimistic UI (show user message immediately)
 * - Auto-fetch chat history on mount
 * - Error handling
 * - Loading state
 */
export const useChat = () => {
  const [state, dispatch] = useReducer(chatReducer, {
    messages: [],
    loading: false,
    error: null,
  });

  /**
   * Fetch chat history from backend
   */
  const fetchHistory = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const history = await aiService.getChatHistory();
      dispatch({ type: "SET_MESSAGES", payload: history });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to load chat history";
      dispatch({ type: "SET_ERROR", payload: errorMsg });
      console.error("[useChat] fetchHistory error:", error);
    }
  }, []);

  /**
   * Send message to AI
   * - Optimistic UI: add user message immediately
   * - Send to backend
   * - Add AI response
   */
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) {
        return;
      }

      try {
        // Optimistic UI: add user message immediately
        dispatch({ type: "ADD_USER_MESSAGE", payload: message });
        dispatch({ type: "SET_LOADING", payload: true });
        dispatch({ type: "SET_ERROR", payload: null });

        // Send to backend (returns ChatWrapperResponse)
        const response = await aiService.chat(message);

        // Add AI response
        dispatch({
          type: "ADD_AI_MESSAGE",
          payload: response.replyMessage || "Xin lỗi, tôi chưa hiểu.",
        });
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Failed to send message";

        // Remove optimistic message and show error
        dispatch({
          type: "SET_MESSAGES",
          payload: state.messages.slice(0, -1), // Remove last (user) message
        });
        dispatch({ type: "SET_ERROR", payload: errorMsg });
        console.error("[useChat] sendMessage error:", error);
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [state.messages],
  );

  /**
   * Clear chat history
   */
  const clearHistory = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      await aiService.deleteChatHistory();
      dispatch({ type: "CLEAR_MESSAGES" });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to clear history";
      dispatch({ type: "SET_ERROR", payload: errorMsg });
      console.error("[useChat] clearHistory error:", error);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  /**
   * Auto-fetch chat history on component mount
   */
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    // State
    messages: state.messages,
    loading: state.loading,
    error: state.error,

    // Actions
    sendMessage,
    fetchHistory,
    clearHistory,
  };
};
