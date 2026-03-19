import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';

export interface Notification {
  id: string;
  title?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type?: string;
}

const mapNotification = (raw: any): Notification => ({
  id: raw.id ?? '',
  title: raw.title ?? '',
  message: raw.message ?? '',
  isRead: raw.isRead ?? false,
  createdAt: raw.createdAt ?? '',
  type: raw.type ?? '',
});

export const notificationService = {
  /** GET /api/notifications */
  async getAll(): Promise<Notification[]> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.notifications.list);
      const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return list.map(mapNotification);
    } catch (e) {
      console.error('getAll notifications error:', e);
      return [];
    }
  },

  /** GET /api/notifications/unread-count */
  async getUnreadCount(): Promise<number> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.notifications.unreadCount);
      return res?.data ?? res ?? 0;
    } catch (e) {
      console.error('getUnreadCount error:', e);
      return 0;
    }
  },

  /** PUT /api/notifications/{id}/read */
  async markAsRead(id: string): Promise<void> {
    await apiService.put<any>(apiConfig.endpoints.notifications.markRead(id));
  },

  /** PUT /api/notifications/read-all */
  async markAllAsRead(): Promise<void> {
    await apiService.put<any>(apiConfig.endpoints.notifications.markAllRead);
  },

  /** DELETE /api/notifications/{id} */
  async delete(id: string): Promise<void> {
    await apiService.delete<any>(apiConfig.endpoints.notifications.delete(id));
  },

  /** GET /api/notifications/settings */
  async getSettings(): Promise<any> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.notifications.settings);
      return res?.data ?? res ?? {};
    } catch (e) {
      console.error('getSettings error:', e);
      return {};
    }
  },

  /** PUT /api/notifications/settings */
  async updateSettings(settings: object): Promise<void> {
    await apiService.put<any>(apiConfig.endpoints.notifications.settings, settings);
  },
};
