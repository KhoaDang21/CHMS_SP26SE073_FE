export { signalRService } from './signalRService';
export { subscribeTicketRealtimeEvents } from './ticketRealtimeService';
export {
  subscribeNotificationEvents,
  type NotificationRealtimeEvent,
} from './notificationRealtimeService';
export {
  subscribeInternalMessages,
  subscribeTicketReplies,
  type InternalMessageEvent,
  type TicketReplyEvent,
} from './chatRealtimeService';
