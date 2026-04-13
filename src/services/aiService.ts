import { apiService } from "./apiService";
import { apiConfig } from "../config/apiConfig";

/**
 * Chat message structure from backend
 */
export interface ChatMessage {
  sender: string; // "User" | "AI"
  message: string;
  timestamp: string;
}

/**
 * Request structure for getting recommendations
 * Used for filter/search UI, NOT for chat messages
 */
export interface RecommendRequest {
  preferences?: string;
  location?: string;
  guestCount?: number;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
}

/**
 * Recommendation response from backend
 */
export interface RecommendResponse {
  message: string;
  recommendedHomestays: any[];
}

/**
 * AI Service Layer
 * All AI logic is handled by the backend
 * Frontend is responsible only for UI and state management
 */
export const aiService = {
  /**
   * POST /api/ai/chat
   * Send message to AI - backend handles ALL logic:
   * - Intent detection
   * - FAQ routing
   * - Recommendations
   * - General Q&A
   */
  async chat(message: string): Promise<string> {
    const res = await apiService.post<any>(apiConfig.endpoints.ai.chat, {
      Message: message,
    });

    // Normalize response - handle different property cases
    const text = res?.data ?? res?.Data ?? res;
    return typeof text === "string" ? text : "";
  },

  /**
   * GET /api/ai/chat/history
   * Retrieve chat history for current user
   */
  async getChatHistory(): Promise<ChatMessage[]> {
    const res = await apiService.get<any>(apiConfig.endpoints.ai.chatHistory);

    // Normalize response structure
    const list: any[] = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];

    return list.map(
      (r: any): ChatMessage => ({
        sender: r.sender ?? "",
        message: r.message ?? "",
        timestamp: r.timestamp ?? new Date().toISOString(),
      }),
    );
  },

  /**
   * DELETE /api/ai/chat/history
   * Clear all chat history for current user
   */
  async deleteChatHistory(): Promise<void> {
    await apiService.delete<any>(apiConfig.endpoints.ai.deleteChatHistory);
  },

  /**
   * POST /api/ai/recommendations
   * Get structured recommendations for filter/search UI
   * NOT used for chat messages
   */
  async getRecommendations(data: RecommendRequest): Promise<RecommendResponse> {
    try {
      const res = await apiService.post<any>(
        apiConfig.endpoints.ai.recommendations,
        {
          Location: data.location,
          GuestCount: data.guestCount ?? 2,
          MinPrice: data.minPrice,
          MaxPrice: data.maxPrice,
          Amenities: data.amenities,
          Preferences: data.preferences,
        },
      );

      // Normalize response - handle different property cases
      const result = res?.data ?? res;
      const message = result?.message ?? result?.Message ?? "";
      const homestays =
        result?.recommendedHomestays ?? result?.RecommendedHomestays ?? [];

      return {
        message,
        recommendedHomestays: Array.isArray(homestays) ? homestays : [],
      };
    } catch (error) {
      console.error("[AI] getRecommendations error:", error);
      return {
        message: "",
        recommendedHomestays: [],
      };
    }
  },

  /**
   * GET /api/ai/faq
   * Retrieve FAQ list (public, used for FAQ screen only)
   */
  async getFaqs(): Promise<any[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.ai.faq);
      const list = res?.data ?? res;
      return Array.isArray(list) ? list : [];
    } catch (error) {
      console.error("[AI] getFaqs error:", error);
      return [];
    }
  },
};
