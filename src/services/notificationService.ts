import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';

export interface Notification {
  id: string;
  title?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  emailNotif: boolean;
  pushNotif: boolean;
  smsNotif: boolean;
}

const mapNotification = (raw: any): Notification => ({
  id: raw.id ?? '',
  title: raw.title ?? '',
  content: raw.content ?? '',
  isRead: raw.isRead ?? false,
  createdAt: raw.createdAt ?? '',
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
    try {
      await apiService.put<any>(apiConfig.endpoints.notifications.markRead(id));
    } catch (e) {
      console.error('markAsRead error:', e);
      throw e;
    }
  },

  /** PUT /api/notifications/read-all */
  async markAllAsRead(): Promise<void> {
    try {
      await apiService.put<any>(apiConfig.endpoints.notifications.markAllRead);
    } catch (e) {
      console.error('markAllAsRead error:', e);
      throw e;
    }
  },

  /** DELETE /api/notifications/{id} */
  async delete(id: string): Promise<void> {
    try {
      await apiService.delete<any>(apiConfig.endpoints.notifications.delete(id));
    } catch (e) {
      console.error('delete notification error:', e);
      throw e;
    }
  },

  /** GET /api/notifications/settings */
  async getSettings(): Promise<NotificationSettings> {
    try {
      const res = await apiService.get<any>(apiConfig.endpoints.notifications.settings);
      const d = res?.data ?? res ?? {};
      return {
        emailNotif: d.emailNotif ?? d.EmailNotif ?? true,
        pushNotif: d.pushNotif ?? d.PushNotif ?? true,
        smsNotif: d.smsNotif ?? d.SmsNotif ?? false,
      };
    } catch (e) {
      console.error('getSettings error:', e);
      return { emailNotif: true, pushNotif: true, smsNotif: false };
    }
  },

  /** PUT /api/notifications/settings */
  async updateSettings(settings: NotificationSettings): Promise<void> {
    await apiService.put<any>(apiConfig.endpoints.notifications.settings, settings);
  },
};
