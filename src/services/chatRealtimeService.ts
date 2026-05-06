import type { HubConnection } from '@microsoft/signalr';

export interface InternalMessageEvent {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface TicketReplyEvent {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  attachmentUrl?: string;
  attachmentUrls?: string[];
  createdAt: string;
}

/**
 * Subscribe to internal chat messages from ChatHub
 */
export function subscribeInternalMessages(
  connection: HubConnection,
  onMessage: (message: InternalMessageEvent) => void,
): () => void {
  const handler = (payload: any) => {
    console.log('[ChatRealtime] Received internal message:', payload);
    
    const message: InternalMessageEvent = {
      id: payload.id || payload.Id,
      conversationId: payload.conversationId || payload.ConversationId,
      senderId: payload.senderId || payload.SenderId,
      senderName: payload.senderName || payload.SenderName,
      content: payload.content || payload.Content,
      createdAt: payload.createdAt || payload.CreatedAt,
    };

    onMessage(message);
  };

  connection.on('ReceiveInternalMessage', handler);

  return () => {
    connection.off('ReceiveInternalMessage', handler);
  };
}

/**
 * Subscribe to ticket reply messages from ChatHub
 */
export function subscribeTicketReplies(
  connection: HubConnection,
  onReply: (reply: TicketReplyEvent) => void,
): () => void {
  const handler = (payload: any) => {
    console.log('[ChatRealtime] Received ticket reply:', payload);
    
    const reply: TicketReplyEvent = {
      id: payload.id || payload.Id,
      senderId: payload.senderId || payload.SenderId,
      senderName: payload.senderName || payload.SenderName,
      message: payload.message || payload.Message,
      attachmentUrl: payload.attachmentUrl || payload.AttachmentUrl,
      attachmentUrls: payload.attachmentUrls || payload.AttachmentUrls || [],
      createdAt: payload.createdAt || payload.CreatedAt,
    };

    onReply(reply);
  };

  connection.on('ReceiveTicketReply', handler);

  return () => {
    connection.off('ReceiveTicketReply', handler);
  };
}
