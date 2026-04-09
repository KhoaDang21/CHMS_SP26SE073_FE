import { apiConfig } from '../config/apiConfig';
import { apiService } from './apiService';

export type StaffTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface StaffTicketReply {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface StaffTicket {
  id: string;
  ticketNumber?: string;
  title: string;
  description?: string;
  bookingId?: string;
  homestayId?: string;
  homestayName?: string;
  status: StaffTicketStatus;
  priority: string;
  category?: string;
  customerName: string;
  customerEmail?: string;
  staffName?: string;
  createdAt: string;
}

export interface StaffTicketDetail extends StaffTicket {
  bookingId?: string;
  replies: StaffTicketReply[];
}

const extractList = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
};

const normalizeStatus = (raw: any): StaffTicketStatus => {
  const value = String(raw || 'OPEN').toUpperCase();
  if (value === 'IN_PROGRESS' || value === 'IN-PROGRESS') return 'IN_PROGRESS';
  if (value === 'RESOLVED') return 'RESOLVED';
  if (value === 'CLOSED') return 'CLOSED';
  return 'OPEN';
};

const mapTicket = (raw: any): StaffTicket => ({
  id: String(raw?.id || ''),
  ticketNumber: raw?.ticketNumber ? String(raw.ticketNumber) : undefined,
  title: String(raw?.title || raw?.subject || ''),
  description: raw?.description ? String(raw.description) : undefined,
  bookingId: raw?.bookingId ? String(raw.bookingId) : undefined,
  homestayId: raw?.homestayId ? String(raw.homestayId) : undefined,
  homestayName: raw?.homestayName ? String(raw.homestayName) : undefined,
  status: normalizeStatus(raw?.status),
  priority: String(raw?.priority || 'NORMAL'),
  category: raw?.category ? String(raw.category) : undefined,
  customerName: String(raw?.customerName || ''),
  customerEmail: raw?.customerEmail ? String(raw.customerEmail) : undefined,
  staffName: raw?.staffName ? String(raw.staffName) : undefined,
  createdAt: String(raw?.createdAt || new Date().toISOString()),
});

const mapTicketDetail = (raw: any): StaffTicketDetail => ({
  ...mapTicket(raw),
  bookingId: raw?.bookingId ? String(raw.bookingId) : undefined,
  replies: Array.isArray(raw?.replies)
    ? raw.replies.map((reply: any): StaffTicketReply => ({
        id: String(reply?.id || ''),
        senderId: String(reply?.senderId || ''),
        senderName: String(reply?.senderName || ''),
        message: String(reply?.message || ''),
        createdAt: String(reply?.createdAt || new Date().toISOString()),
      }))
    : [],
});

export const staffTicketService = {
  async list(): Promise<StaffTicket[]> {
    const response = await apiService.get<any>(apiConfig.endpoints.staffTickets.list);
    return extractList(response).map(mapTicket).filter((item) => item.id);
  },

  async getDetail(ticketId: string): Promise<StaffTicketDetail | null> {
    try {
      const response = await apiService.get<any>(apiConfig.endpoints.staffTickets.detail(ticketId));
      const raw = response?.data ?? response;
      if (!raw?.id) return null;
      return mapTicketDetail(raw);
    } catch (error) {
      console.error('Load staff ticket detail error:', error);
      return null;
    }
  },

  async assign(ticketId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.put<any>(apiConfig.endpoints.staffTickets.assign(ticketId), {});
      return {
        success: response?.success ?? true,
        message: response?.message ?? 'Nhận ticket thành công',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Không thể nhận ticket',
      };
    }
  },

  async reply(ticketId: string, message: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post<any>(apiConfig.endpoints.staffTickets.reply(ticketId), { message });
      return {
        success: response?.success ?? true,
        message: response?.message ?? 'Gửi phản hồi thành công',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Không thể gửi phản hồi',
      };
    }
  },

  async updateStatus(ticketId: string, status: StaffTicketStatus): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.patch<any>(apiConfig.endpoints.staffTickets.updateStatus(ticketId), { status });
      return {
        success: response?.success ?? true,
        message: response?.message ?? 'Cập nhật trạng thái thành công',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Không thể cập nhật trạng thái',
      };
    }
  },
};
