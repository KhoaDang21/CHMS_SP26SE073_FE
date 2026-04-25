import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/authService';
import { notificationService, type Notification } from '../../services/notificationService';
import { signalRService } from '../../services/signalRService';

interface BackofficeNotificationBellProps {
  iconClassName?: string;
  buttonClassName?: string;
}

const formatTime = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function BackofficeNotificationBell({
  iconClassName = 'w-6 h-6 text-gray-600',
  buttonClassName = 'p-2 hover:bg-gray-100 rounded-lg relative',
}: BackofficeNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const shownRealtimeNotifIdsRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    notificationService
      .getUnreadCount()
      .then((count) => {
        if (mounted) setUnreadCount(count);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const token = authService.getToken();
    const userId = authService.getUser()?.id;
    if (!token) return;

    let mounted = true;
    let receiveHandler: ((notif: Notification) => void) | null = null;
    let newHandler: ((notif: Notification) => void) | null = null;

    signalRService
      .connect(token)
      .then((conn) => {
        if (!mounted || !conn) return;

        if (userId) {
          conn.invoke('JoinUserGroup', userId).catch(() => {});
        }

        const handleRealtimeNotification = (notif: Notification) => {
          if (!notif?.id) return;
          if (shownRealtimeNotifIdsRef.current.has(notif.id)) return;
          shownRealtimeNotifIdsRef.current.add(notif.id);

          setNotifications((prev) => {
            if (prev.some((item) => item.id === notif.id)) {
              return prev;
            }
            return [notif, ...prev];
          });

          if (!notif.isRead) {
            setUnreadCount((prev) => prev + 1);
          }

          toast.success(notif.title || 'Thông báo mới', {
            description: notif.content,
          });
        };

        receiveHandler = handleRealtimeNotification;
        newHandler = handleRealtimeNotification;
        conn.on('ReceiveNotification', receiveHandler);
        conn.on('NewNotification', newHandler);
      })
      .catch(() => {});

    return () => {
      mounted = false;
      shownRealtimeNotifIdsRef.current.clear();
      const conn = signalRService.getConnection();
      if (receiveHandler) conn?.off('ReceiveNotification', receiveHandler);
      if (newHandler) conn?.off('NewNotification', newHandler);
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (event: globalThis.MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  const handleOpen = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    setIsLoading(true);
    try {
      const list = await notificationService.getAll();
      setNotifications(list);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      toast.error('Không thể đánh dấu tất cả đã đọc');
    }
  };

  const handleDelete = async (id: string, event: ReactMouseEvent) => {
    event.stopPropagation();
    try {
      await notificationService.delete(id);
      const deleted = notifications.find((item) => item.id === id);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      if (deleted && !deleted.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      toast.error('Không thể xóa thông báo');
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={handleOpen} className={buttonClassName} type="button">
        <Bell className={iconClassName} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-0.5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800">Thông báo</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors"
                type="button"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-sm text-gray-500">Đang tải thông báo...</div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">Không có thông báo</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.isRead) {
                      void handleMarkAsRead(notif.id);
                    }
                  }}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors group ${
                    !notif.isRead ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="mt-1.5 flex-shrink-0">
                    {!notif.isRead ? (
                      <span className="w-2 h-2 bg-blue-500 rounded-full block" />
                    ) : (
                      <span className="w-2 h-2 rounded-full block" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {notif.title && (
                      <p className={`text-sm font-medium truncate ${!notif.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                        {notif.title}
                      </p>
                    )}
                    <p className={`text-sm ${!notif.isRead ? 'text-gray-700' : 'text-gray-500'} line-clamp-2`}>
                      {notif.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatTime(notif.createdAt)}</p>
                  </div>

                  <button
                    onClick={(e) => {
                      void handleDelete(notif.id, e);
                    }}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                    type="button"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
