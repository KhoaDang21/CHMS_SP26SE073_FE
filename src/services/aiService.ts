import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';

// BE ChatMessageDTO
export interface ChatMessage {
  sender: string;   // "User" | "AI"
  message: string;
  timestamp: string;
}

export interface RecommendRequest {
  preferences: string;  // VD: "View biển, giá rẻ"
  location?: string;
  guestCount?: number;
}

export const aiService = {
  /** POST /api/ai/chat — gửi tin nhắn tới AI */
  async chat(message: string): Promise<string> {
    const res = await apiService.post<any>(apiConfig.endpoints.ai.chat, { message });
    // BE: ApiResponse<string> → { success, data: "..." }
    const text = res?.data ?? res;
    return typeof text === 'string' ? text : '';
  },

  /** GET /api/ai/chat/history */
  async getChatHistory(): Promise<ChatMessage[]> {
    const res = await apiService.get<any>(apiConfig.endpoints.ai.chatHistory);
    // BE: ApiResponse<List<ChatMessageDTO>> → { success, data: [...] }
    const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return list.map((r: any): ChatMessage => ({
      sender: r.sender ?? '',
      message: r.message ?? '',
      timestamp: r.timestamp ?? new Date().toISOString(),
    }));
  },

  /** DELETE /api/ai/chat/history */
  async deleteChatHistory(): Promise<void> {
    await apiService.delete<any>(apiConfig.endpoints.ai.deleteChatHistory);
    // Throws nếu BE fail — để caller xử lý
  },

  /** POST /api/ai/recommendations */
  async getRecommendations(data: RecommendRequest): Promise<any[]> {
    try {
      const res = await apiService.post<any>(apiConfig.endpoints.ai.recommendations, {
        preferences: data.preferences,
        location: data.location,
        guestCount: data.guestCount,
      });
      const list = res?.data ?? res;
      return Array.isArray(list) ? list : [];
    } catch (e) {
      console.error('getRecommendations error:', e);
      return [];
    }
  },

  /** GET /api/ai/faq — public, không cần token */
  async getFaqs(): Promise<any[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.ai.faq);
      const list = res?.data ?? res;
      return Array.isArray(list) ? list : [];
    } catch (e) {
      console.error('getFaqs error:', e);
      return [];
    }
  },

  /** POST /api/ai/faq/ask */
  async askFaq(message: string): Promise<string> {
    const res = await apiService.post<any>(apiConfig.endpoints.ai.askFaq, { message });
    const text = res?.data ?? res;
    return typeof text === 'string' ? text : '';
  },
};
