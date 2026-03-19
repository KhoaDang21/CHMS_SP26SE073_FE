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
    try {
      const res = await apiService.post<any>(apiConfig.endpoints.ai.chat, { message });
      return res?.data ?? res ?? '';
    } catch (e) {
      console.error('AI chat error:', e);
      return '';
    }
  },

  /** GET /api/ai/chat/history */
  async getChatHistory(): Promise<ChatMessage[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.ai.chatHistory);
      const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map((r: any): ChatMessage => ({
        sender: r.sender ?? '',
        message: r.message ?? '',
        timestamp: r.timestamp ?? '',
      }));
    } catch (e) {
      console.error('getChatHistory error:', e);
      return [];
    }
  },

  /** DELETE /api/ai/chat/history */
  async deleteChatHistory(): Promise<void> {
    await apiService.delete<any>(apiConfig.endpoints.ai.deleteChatHistory);
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
    try {
      const res = await apiService.post<any>(apiConfig.endpoints.ai.askFaq, { message });
      return res?.data ?? res ?? '';
    } catch (e) {
      console.error('askFaq error:', e);
      return '';
    }
  },
};
