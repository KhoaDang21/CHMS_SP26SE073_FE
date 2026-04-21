import type { HubConnection } from '@microsoft/signalr';

export interface TicketRealtimeEvent {
  eventName: string;
  payload: any;
  ticketId?: string;
  isTicketEvent: boolean;
}

const TICKET_EVENT_NAMES = [
  'ReceiveTicketMessage',
  'TicketMessageReceived',
  'SupportTicketMessageReceived',
  'NewTicketMessage',
  'ReceiveSupportTicketMessage',
  'TicketUpdated',
  'SupportTicketUpdated',
  'TicketStatusChanged',
  'SupportTicketStatusChanged',
  'TicketAssigned',
  'ReceiveNotification',
  'NewNotification',
];

const TICKET_KEYWORDS = ['ticket', 'support', 'ho tro', 'hỗ trợ', 'khieu nai', 'khiếu nại'];

function toText(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function pickByPath(source: any, path: string): unknown {
  if (!source || typeof source !== 'object') return undefined;
  return path.split('.').reduce((acc: any, part) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return acc[part];
  }, source);
}

function extractTicketId(payload: any): string | undefined {
  const candidates = [
    'ticketId',
    'TicketId',
    'supportTicketId',
    'SupportTicketId',
    'id',
    'Id',
    'entityId',
    'EntityId',
    'referenceId',
    'ReferenceId',
    'data.ticketId',
    'data.TicketId',
    'payload.ticketId',
    'payload.TicketId',
  ];

  for (const path of candidates) {
    const value = toText(pickByPath(payload, path));
    if (value) return value;
  }

  return undefined;
}

function includesTicketKeyword(value: string): boolean {
  const normalized = value.toLowerCase();
  return TICKET_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isTicketPayload(eventName: string, payload: any): boolean {
  if (includesTicketKeyword(eventName)) return true;

  const textCandidates = [
    toText(payload?.type),
    toText(payload?.Type),
    toText(payload?.category),
    toText(payload?.Category),
    toText(payload?.title),
    toText(payload?.Title),
    toText(payload?.content),
    toText(payload?.Content),
    toText(payload?.message),
    toText(payload?.Message),
  ].filter(Boolean);

  return textCandidates.some(includesTicketKeyword);
}

export function subscribeTicketRealtimeEvents(
  connection: HubConnection,
  onEvent: (event: TicketRealtimeEvent) => void,
): () => void {
  const handlers = TICKET_EVENT_NAMES.map((eventName) => {
    const handler = (payload: any) => {
      const ticketId = extractTicketId(payload);
      const isTicketEvent = Boolean(ticketId) || isTicketPayload(eventName, payload);
      onEvent({ eventName, payload, ticketId, isTicketEvent });
    };

    connection.on(eventName, handler);
    return { eventName, handler };
  });

  return () => {
    handlers.forEach(({ eventName, handler }) => {
      connection.off(eventName, handler);
    });
  };
}
