import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';

// BE TicketResponseDTO
export interface Ticket {
  id: string;
  title: string;
  priority: string;   // HIGH | NORMAL | LOW
  status: string;     // OPEN | IN_PROGRESS | RESOLVED | CLOSED
  customerName: string;
  staffName?: string;
  createdAt: string;
}

// BE TicketDetailResponseDTO
export interface TicketDetail extends Ticket {
  description: string;
  bookingId?: string;
  replies: TicketReply[];
}

export interface TicketReply {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  priority?: string;  // HIGH | NORMAL | LOW — default NORMAL
  bookingId?: string;
}

const mapTicket = (raw: any): Ticket => ({
  id: raw.id ?? '',
  title: raw.title ?? '',
  priority: raw.priority ?? 'NORMAL',
  status: raw.status ?? '',
  customerName: raw.customerName ?? '',
  staffName: raw.staffName ?? undefined,
  createdAt: raw.createdAt ?? '',
});

const mapTicketDetail = (raw: any): TicketDetail => ({
  ...mapTicket(raw),
  description: raw.description ?? '',
  bookingId: raw.bookingId ?? undefined,
  replies: (raw.replies ?? []).map((r: any): TicketReply => ({
    id: r.id ?? '',
    senderId: r.senderId ?? '',
    senderName: r.senderName ?? '',
    message: r.message ?? '',
    createdAt: r.createdAt ?? '',
  })),
});

export const supportTicketService = {
  /** POST /api/support/tickets */
  async create(data: CreateTicketRequest): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiService.post<any>(apiConfig.endpoints.supportTickets.create, data);
      return { success: res?.success ?? true, message: res?.message ?? 'Tạo yêu cầu thành công.' };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Đã xảy ra lỗi.' };
    }
  },

  /** GET /api/support/tickets */
  async getMyTickets(): Promise<Ticket[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.supportTickets.list);
      const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map(mapTicket);
    } catch (e) {
      console.error('getMyTickets error:', e);
      return [];
    }
  },

  /** GET /api/support/tickets/{id} */
  async getDetail(id: string): Promise<TicketDetail | null> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.supportTickets.detail(id));
      const raw = res?.data ?? res;
      if (!raw?.id) return null;
      return mapTicketDetail(raw);
    } catch (e) {
      console.error('getDetail ticket error:', e);
      return null;
    }
  },

  /** POST /api/support/tickets/{id}/messages */
  async sendMessage(id: string, message: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiService.post<any>(apiConfig.endpoints.supportTickets.sendMessage(id), { message });
      return { success: res?.success ?? true, message: res?.message ?? 'Gửi tin nhắn thành công.' };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Đã xảy ra lỗi.' };
    }
  },

  /** POST /api/support/tickets/{id}/close */
  async close(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiService.post<any>(apiConfig.endpoints.supportTickets.close(id));
      return { success: res?.success ?? true, message: res?.message ?? 'Đã đóng yêu cầu.' };
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Đã xảy ra lỗi.' };
    }
  },
};
