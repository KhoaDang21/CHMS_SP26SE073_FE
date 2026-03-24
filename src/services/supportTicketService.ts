import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';

// ─── BE TicketResponseDTO (list item) ────────────────────────────────────────
// Fields: id, title, priority, status, customerName, staffName?, createdAt
// NOTE: bookingId is NOT in list response — only in detail
export interface Ticket {
  id: string;
  title: string;
  priority: string;   // HIGH | NORMAL | LOW
  status: string;     // OPEN | IN_PROGRESS | RESOLVED | CLOSED
  customerName: string;
  staffName?: string;
  createdAt: string;
}

// ─── BE TicketDetailResponseDTO ───────────────────────────────────────────────
// Fields: id, title, description, priority, status, bookingId?, customerName, staffName?, createdAt, replies[]
export interface TicketDetail extends Ticket {
  description: string;
  bookingId?: string;
  replies: TicketReply[];
}

// ─── BE TicketReplyDTO ────────────────────────────────────────────────────────
// Fields: id, senderId (Guid), senderName, message, createdAt
export interface TicketReply {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

// ─── BE CreateTicketRequestDTO ────────────────────────────────────────────────
// Fields: Title, Description, Priority (default "NORMAL"), BookingId (Guid?, optional)
export interface CreateTicketRequest {
  title: string;
  description: string;
  priority?: string;  // HIGH | NORMAL | LOW
  bookingId?: string; // Guid — optional per BE, but we enforce in UX
}

// ─── Mappers ──────────────────────────────────────────────────────────────────
const mapTicket = (raw: any): Ticket => ({
  id: String(raw.id ?? ''),
  title: raw.title ?? '',
  priority: raw.priority ?? 'NORMAL',
  status: raw.status ?? 'OPEN',
  customerName: raw.customerName ?? '',
  staffName: raw.staffName ?? undefined,
  createdAt: raw.createdAt ?? '',
});

const mapTicketDetail = (raw: any): TicketDetail => ({
  ...mapTicket(raw),
  description: raw.description ?? '',
  bookingId: raw.bookingId ?? undefined,
  replies: Array.isArray(raw.replies)
    ? raw.replies.map((r: any): TicketReply => ({
        id: String(r.id ?? ''),
        senderId: String(r.senderId ?? ''),
        senderName: r.senderName ?? '',
        message: r.message ?? '',
        createdAt: r.createdAt ?? '',
      }))
    : [],
});

// ─── Service ──────────────────────────────────────────────────────────────────
export const supportTicketService = {
  /**
   * POST /api/support/tickets
   * Body: { title, description, priority, bookingId? }
   * Returns: ApiResponse (success/message only)
   */
  async create(data: CreateTicketRequest): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiService.post<any>(apiConfig.endpoints.supportTickets.create, data);
      return { success: res?.success ?? true, message: res?.message ?? 'Tạo yêu cầu thành công.' };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Đã xảy ra lỗi.' };
    }
  },

  /**
   * GET /api/support/tickets
   * Returns: ApiResponse<List<TicketResponseDTO>>
   * BE wraps in { success, data: [...] }
   */
  async getMyTickets(): Promise<Ticket[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.supportTickets.list);
      // BE: ApiResponse<object>.SuccessResult(result) → { success, data: [...] }
      const list: any[] = Array.isArray(res?.data) ? res.data
        : Array.isArray(res) ? res
        : [];
      return list.map(mapTicket);
    } catch (e) {
      console.error('getMyTickets error:', e);
      return [];
    }
  },

  /**
   * GET /api/support/tickets/{id}
   * Returns: ApiResponse<TicketDetailResponseDTO>
   * BE wraps in { success, data: { id, title, description, ..., replies: [...] } }
   */
  async getDetail(id: string): Promise<TicketDetail | null> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.supportTickets.detail(id));
      // BE: ApiResponse<object>.SuccessResult(result) → { success, data: {...} }
      const raw = res?.data ?? res;
      if (!raw?.id) return null;
      return mapTicketDetail(raw);
    } catch (e) {
      console.error('getDetail ticket error:', e);
      return null;
    }
  },

  /**
   * POST /api/support/tickets/{id}/messages
   * Body: { message }  ← BE ReplyTicketRequestDTO has only "Message"
   * Returns: ApiResponse (success/message only)
   */
  async sendMessage(id: string, message: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiService.post<any>(
        apiConfig.endpoints.supportTickets.sendMessage(id),
        { message }  // matches ReplyTicketRequestDTO.Message
      );
      return { success: res?.success ?? true, message: res?.message ?? 'Gửi tin nhắn thành công.' };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Đã xảy ra lỗi.' };
    }
  },

  /**
   * POST /api/support/tickets/{id}/close
   * No body required
   * Returns: ApiResponse (success/message only)
   */
  async close(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiService.post<any>(apiConfig.endpoints.supportTickets.close(id));
      return { success: res?.success ?? true, message: res?.message ?? 'Đã đóng yêu cầu.' };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Đã xảy ra lỗi.' };
    }
  },
};
