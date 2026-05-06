import * as signalR from "@microsoft/signalr";

const API_URL = import.meta.env.VITE_API_URL ?? "http://163.227.230.54:8088";
const NOTIFICATION_HUB_URL = `${API_URL}/notificationHub`;
const CHAT_HUB_URL = `${API_URL}/chatHub`;

let notificationConnection: signalR.HubConnection | null = null;
let chatConnection: signalR.HubConnection | null = null;
let isNotificationConnecting = false;
let isChatConnecting = false;
let connectionError: Error | null = null;

// Log the hub URLs for debugging
console.log("[SignalR] NotificationHub URL:", NOTIFICATION_HUB_URL);
console.log("[SignalR] ChatHub URL:", CHAT_HUB_URL);
console.log("[SignalR] API URL env:", import.meta.env.VITE_API_URL);

export const signalRService = {
  /** Test if backend API is reachable */
  async testBackendConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/health`, {
        method: "GET",
        mode: "no-cors", // Test basic connectivity
      });
      console.log("[SignalR] Backend health check:", response.status);
      return response.ok || response.status === 0; // 0 = no-cors allowed
    } catch (error) {
      console.error("[SignalR] Backend unreachable:", error);
      return false;
    }
  },

  /** Kết nối NotificationHub để nhận thông báo realtime */
  async connectNotificationHub(token: string): Promise<signalR.HubConnection | null> {
    if (
      notificationConnection &&
      notificationConnection.state === signalR.HubConnectionState.Connected
    ) {
      return notificationConnection;
    }

    if (isNotificationConnecting) {
      return notificationConnection;
    }

    isNotificationConnecting = true;
    connectionError = null;

    try {
      console.log("[SignalR] Starting connection to NotificationHub:", NOTIFICATION_HUB_URL);
      notificationConnection = new signalR.HubConnectionBuilder()
        .withUrl(NOTIFICATION_HUB_URL, {
          accessTokenFactory: () => token,
          withCredentials: true,
        })
        .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Error)
        .build();

      notificationConnection.onclose((error) => {
        console.warn("[SignalR] NotificationHub closed:", error?.message);
        connectionError = error || new Error("Connection closed");
        notificationConnection = null;
      });

      notificationConnection.onreconnecting((error) => {
        console.warn("[SignalR] NotificationHub reconnecting:", error?.message);
      });

      notificationConnection.onreconnected((connectionId) => {
        console.log("[SignalR] NotificationHub reconnected, ID:", connectionId);
        connectionError = null;
      });

      await notificationConnection.start();
      console.log("[SignalR] ✓ NotificationHub connected successfully!");
      return notificationConnection;
    } catch (error) {
      console.error(
        "[SignalR] NotificationHub connection failed:",
        error instanceof Error ? error.message : String(error),
      );
      connectionError =
        error instanceof Error ? error : new Error(String(error));
      notificationConnection = null;
      return null;
    } finally {
      isNotificationConnecting = false;
    }
  },

  /** Kết nối ChatHub để nhận tin nhắn chat và ticket reply */
  async connectChatHub(token: string): Promise<signalR.HubConnection | null> {
    if (
      chatConnection &&
      chatConnection.state === signalR.HubConnectionState.Connected
    ) {
      return chatConnection;
    }

    if (isChatConnecting) {
      return chatConnection;
    }

    isChatConnecting = true;

    try {
      console.log("[SignalR] Starting connection to ChatHub:", CHAT_HUB_URL);
      chatConnection = new signalR.HubConnectionBuilder()
        .withUrl(CHAT_HUB_URL, {
          accessTokenFactory: () => token,
          withCredentials: true,
        })
        .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Error)
        .build();

      chatConnection.onclose((error) => {
        console.warn("[SignalR] ChatHub closed:", error?.message);
        chatConnection = null;
      });

      chatConnection.onreconnecting((error) => {
        console.warn("[SignalR] ChatHub reconnecting:", error?.message);
      });

      chatConnection.onreconnected((connectionId) => {
        console.log("[SignalR] ChatHub reconnected, ID:", connectionId);
      });

      await chatConnection.start();
      console.log("[SignalR] ✓ ChatHub connected successfully!");
      return chatConnection;
    } catch (error) {
      console.error(
        "[SignalR] ChatHub connection failed:",
        error instanceof Error ? error.message : String(error),
      );
      chatConnection = null;
      return null;
    } finally {
      isChatConnecting = false;
    }
  },

  /** Join user group trong ChatHub để nhận tin nhắn */
  async joinChatRoom(userId: string): Promise<void> {
    try {
      if (!chatConnection || chatConnection.state !== signalR.HubConnectionState.Connected) {
        console.warn('[SignalR] ChatHub not connected, cannot join room');
        return;
      }

      await chatConnection.invoke('JoinRoom', userId);
      console.log('[SignalR] Joined chat room:', userId);
    } catch (error) {
      console.error('[SignalR] Failed to join chat room:', error);
    }
  },

  /** Leave user group trong ChatHub */
  async leaveChatRoom(userId: string): Promise<void> {
    try {
      if (chatConnection && chatConnection.state === signalR.HubConnectionState.Connected) {
        await chatConnection.invoke('LeaveRoom', userId);
        console.log('[SignalR] Left chat room:', userId);
      }
    } catch (error) {
      console.error('[SignalR] Failed to leave chat room:', error);
    }
  },

  /** Kết nối cả hai hub (backward compatible với code cũ) */
  async connect(token: string): Promise<signalR.HubConnection | null> {
    await this.connectNotificationHub(token);
    await this.connectChatHub(token);
    return notificationConnection;
  },

  /** Ngắt kết nối NotificationHub */
  async disconnectNotificationHub(): Promise<void> {
    try {
      if (notificationConnection) {
        await notificationConnection.stop();
      }
    } catch (error) {
      console.error("[SignalR] Error disconnecting NotificationHub:", error);
    } finally {
      notificationConnection = null;
      isNotificationConnecting = false;
    }
  },

  /** Ngắt kết nối ChatHub */
  async disconnectChatHub(): Promise<void> {
    try {
      if (chatConnection) {
        await chatConnection.stop();
      }
    } catch (error) {
      console.error("[SignalR] Error disconnecting ChatHub:", error);
    } finally {
      chatConnection = null;
      isChatConnecting = false;
    }
  },

  /** Ngắt tất cả kết nối */
  async disconnect(): Promise<void> {
    await Promise.all([
      this.disconnectNotificationHub(),
      this.disconnectChatHub(),
    ]);
  },

  /** Lấy NotificationHub connection */
  getNotificationConnection(): signalR.HubConnection | null {
    return notificationConnection;
  },

  /** Lấy ChatHub connection */
  getChatConnection(): signalR.HubConnection | null {
    return chatConnection;
  },

  /** Backward compatible - trả về NotificationHub connection */
  getConnection(): signalR.HubConnection | null {
    return notificationConnection;
  },

  /** Kiểm tra NotificationHub đã kết nối chưa */
  isNotificationConnected(): boolean {
    return notificationConnection?.state === signalR.HubConnectionState.Connected;
  },

  /** Kiểm tra ChatHub đã kết nối chưa */
  isChatConnected(): boolean {
    return chatConnection?.state === signalR.HubConnectionState.Connected;
  },

  /** Backward compatible - kiểm tra NotificationHub */
  isConnected(): boolean {
    return this.isNotificationConnected();
  },

  getLastError(): Error | null {
    return connectionError;
  },
};
