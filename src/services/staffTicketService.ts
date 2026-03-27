import { apiConfig } from '../config/apiConfig';
import { apiService } from './apiService';

export type StaffTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface StaffTicket {
  id: string;
  ticketNumber?: string;
  title: string;
  description?: string;
  status: StaffTicketStatus;
  priority: string;
  category?: string;
  customerName: string;
  customerEmail?: string;
  staffName?: string;
  createdAt: string;
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
  status: normalizeStatus(raw?.status),
  priority: String(raw?.priority || 'NORMAL'),
  category: raw?.category ? String(raw.category) : undefined,
  customerName: String(raw?.customerName || ''),
  customerEmail: raw?.customerEmail ? String(raw.customerEmail) : undefined,
  staffName: raw?.staffName ? String(raw.staffName) : undefined,
  createdAt: String(raw?.createdAt || new Date().toISOString()),
});

export const staffTicketService = {
  async list(): Promise<StaffTicket[]> {
    const response = await apiService.get<any>(apiConfig.endpoints.staffTickets.list);
    return extractList(response).map(mapTicket).filter((item) => item.id);
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
