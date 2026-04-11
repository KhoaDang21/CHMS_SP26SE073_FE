import * as signalR from "@microsoft/signalr";

const HUB_URL = `${import.meta.env.VITE_API_URL ?? "http://163.227.230.54:8088"}/notificationHub`;

let connection: signalR.HubConnection | null = null;
let isConnecting = false;
let connectionError: Error | null = null;

// Log the hub URL for debugging
console.log("[SignalR] Hub URL:", HUB_URL);
console.log("[SignalR] API URL env:", import.meta.env.VITE_API_URL);

export const signalRService = {
  /** Test if backend API is reachable */
  async testBackendConnection(): Promise<boolean> {
    try {
      const apiUrl =
        import.meta.env.VITE_API_URL ?? "http://163.227.230.54:8088";
      const response = await fetch(`${apiUrl}/api/health`, {
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

  /** Khởi tạo và kết nối hub, truyền token JWT để xác thực */
  async connect(token: string): Promise<signalR.HubConnection | null> {
    // Return existing connection if already connected
    if (
      connection &&
      connection.state === signalR.HubConnectionState.Connected
    ) {
      return connection;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnecting) {
      return connection;
    }

    isConnecting = true;
    connectionError = null;

    try {
      console.log("[SignalR] Starting connection to", HUB_URL);
      connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          accessTokenFactory: () => token,
          // Không dùng skipNegotiation trừ khi transport chỉ có WebSockets.
          // skipNegotiation + nhiều transport gây lỗi: "Negotiation can only be skipped when using the WebSocket transport directly."
          // Mặc định: POST /negotiate rồi chọn WebSocket → SSE → LongPolling (phù hợp BE MapHub).
          withCredentials: true,
        })
        .withAutomaticReconnect([0, 1000, 2000, 5000, 10000]) // Retry: 0ms, 1s, 2s, 5s, 10s
        .configureLogging(signalR.LogLevel.Error) // Only log errors
        .build();

      // Handle connection closed
      connection.onclose((error) => {
        console.warn("[SignalR] Connection closed:", error?.message);
        connectionError = error || new Error("Connection closed");
        connection = null;
      });

      // Handle reconnecting
      connection.onreconnecting((error) => {
        console.warn(
          "[SignalR] Attempting reconnect after error:",
          error?.message,
        );
      });

      // Handle reconnected
      connection.onreconnected((connectionId) => {
        console.log("[SignalR] Reconnected successfully, ID:", connectionId);
        connectionError = null;
      });

      await connection.start();
      console.log("[SignalR] ✓ Connected successfully!");
      return connection;
    } catch (error) {
      console.error(
        "[SignalR] ✗ Connection failed:",
        error instanceof Error ? error.message : String(error),
      );
      connectionError =
        error instanceof Error ? error : new Error(String(error));
      connection = null;
      // Return null instead of throwing to prevent app crash
      return null;
    } finally {
      isConnecting = false;
    }
  },

  /** Ngắt kết nối */
  async disconnect(): Promise<void> {
    try {
      if (connection) {
        await connection.stop();
      }
    } catch (error) {
      console.error("[SignalR] Error disconnecting:", error);
    } finally {
      connection = null;
      isConnecting = false;
    }
  },

  getConnection(): signalR.HubConnection | null {
    return connection;
  },

  isConnected(): boolean {
    return connection?.state === signalR.HubConnectionState.Connected;
  },

  getLastError(): Error | null {
    return connectionError;
  },
};
