import type { HubConnection } from '@microsoft/signalr';

export interface NotificationRealtimeEvent {
  type: string;
  title?: string;
  content?: string;
  message?: string;
  referenceId?: string;
  referenceType?: string;
  [key: string]: any;
}

/**
 * Subscribe to notification events from NotificationHub
 */
export function subscribeNotificationEvents(
  connection: HubConnection,
  onEvent: (event: NotificationRealtimeEvent) => void,
): () => void {
  const handler = (payload: any) => {
    console.log('[NotificationRealtime] Received notification:', payload);
    
    const event: NotificationRealtimeEvent = {
      type: payload.type || payload.Type || 'NOTIFICATION',
      title: payload.title || payload.Title,
      content: payload.content || payload.Content,
      message: payload.message || payload.Message,
      referenceId: payload.referenceId || payload.ReferenceId,
      referenceType: payload.referenceType || payload.ReferenceType,
      ...payload,
    };

    onEvent(event);
  };

  connection.on('ReceiveNotification', handler);

  return () => {
    connection.off('ReceiveNotification', handler);
  };
}
