import * as signalR from '@microsoft/signalr';

const HUB_URL = `${import.meta.env.VITE_API_URL ?? 'http://163.227.230.54:8088'}/notificationHub`;

let connection: signalR.HubConnection | null = null;

export const signalRService = {
  /** Khởi tạo và kết nối hub, truyền token JWT để xác thực */
  async connect(token: string): Promise<signalR.HubConnection> {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      return connection;
    }

    connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    await connection.start();
    return connection;
  },

  /** Ngắt kết nối */
  async disconnect(): Promise<void> {
    if (connection) {
      await connection.stop();
      connection = null;
    }
  },

  getConnection(): signalR.HubConnection | null {
    return connection;
  },
};
