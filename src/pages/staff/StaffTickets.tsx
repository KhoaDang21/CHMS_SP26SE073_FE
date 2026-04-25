import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Loader2,
  Search,
  Send,
  UserCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { RoleBadge } from '../../components/common/RoleBadge';
import { staffNavItems } from '../../config/staffNavItems';
import { authService } from '../../services/authService';
import { employeeService } from '../../services/employeeService';
import { staffBookingService } from '../../services/staffBookingService';
import { signalRService } from '../../services/signalRService';
import {
  staffTicketService,
  type StaffTicketDetail,
  type StaffTicket,
  type StaffTicketReply,
  type StaffTicketStatus,
} from '../../services/staffTicketService';
import { subscribeTicketRealtimeEvents } from '../../services/ticketRealtimeService';
import BackofficeNotificationBell from '../../components/common/BackofficeNotificationBell';

type FilterStatus = 'all' | StaffTicketStatus;

function formatTime(dateStr: string) {
  if (!dateStr) return '';
  const normalized = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusTimeline({ status }: { status: StaffTicketStatus }) {
  const steps = [
    { key: 'OPEN', label: 'Mở', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { key: 'IN_PROGRESS', label: 'Đang xử lý', icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'RESOLVED', label: 'Đã giải quyết', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ];
  const order: Record<StaffTicketStatus, number> = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2, CLOSED: 2 };
  const current = order[status] ?? 0;

  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((step, index) => {
        const done = index <= current;
        const active = index === current;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  active
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-200'
                    : done
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step.icon}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  active ? 'text-cyan-600' : done ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full ${index < current ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function normalizeId(value: string | undefined | null): string {
  return String(value || '').trim().toLowerCase();
}

function extractAssignedHomestayIds(source: any): string[] {
  const rawList = [
    ...(Array.isArray(source?.assignedHomestays) ? source.assignedHomestays : []),
    ...(Array.isArray(source?.assignedHomestayIds) ? source.assignedHomestayIds : []),
    ...(Array.isArray(source?.homestayIds) ? source.homestayIds : []),
  ];

  const ids = rawList
    .map((item: any) => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      return String(item?.id || item?.homestayId || item?.value || '');
    })
    .map((id) => id.trim())
    .filter(Boolean);

  return Array.from(new Set(ids));
}

export default function StaffTickets() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<StaffTicketDetail | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [nextStatus, setNextStatus] = useState<StaffTicketStatus>('OPEN');
  const [assignedHomestayCount, setAssignedHomestayCount] = useState(0);
  const realtimeRefreshTimerRef = useRef<number | null>(null);

  const navigationItems = staffNavItems.map((item) => ({
    name: item.label,
    icon: item.icon,
    path: item.path,
    active: item.path === '/staff/tickets',
  }));

  const resolveAssignedHomestayIds = useCallback(async () => {
    if (!currentUser?.id && !currentUser?.email) return [] as string[];

    try {
      if (currentUser?.id) {
        const byId = await employeeService.getEmployeeById(currentUser.id);
        const idsById = extractAssignedHomestayIds(byId);
        if (idsById.length > 0) return idsById;
      }

      const employees = await employeeService.getEmployees();
      const matched = employees.find((item) => {
        const itemId = String(item?.id || '').trim().toLowerCase();
        const itemEmail = String(item?.email || '').trim().toLowerCase();
        const userId = String(currentUser?.id || '').trim().toLowerCase();
        const userEmail = String(currentUser?.email || '').trim().toLowerCase();
        return (userId && itemId === userId) || (userEmail && itemEmail === userEmail);
      });

      return extractAssignedHomestayIds(matched);
    } catch (error) {
      console.error('Resolve assigned homestays error:', error);
      return [] as string[];
    }
  }, [currentUser?.email, currentUser?.id]);

  const resolveTicketHomestayId = useCallback(async (ticket: StaffTicket): Promise<string | null> => {
    if (ticket.homestayId) return ticket.homestayId;

    const bookingIdFromList = String(ticket.bookingId || '').trim();
    if (bookingIdFromList) {
      const booking = await staffBookingService.getBookingById(bookingIdFromList);
      const bookingHomestayId = String(booking?.homestayId || '').trim();
      return bookingHomestayId || null;
    }

    const detail = await staffTicketService.getDetail(ticket.id);
    if (detail?.homestayId) return detail.homestayId;

    const bookingIdFromDetail = String(detail?.bookingId || '').trim();
    if (!bookingIdFromDetail) return null;

    const booking = await staffBookingService.getBookingById(bookingIdFromDetail);
    const bookingHomestayId = String(booking?.homestayId || '').trim();
    return bookingHomestayId || null;
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const [list, assignedHomestayIds] = await Promise.all([
        staffTicketService.list(),
        resolveAssignedHomestayIds(),
      ]);

      setAssignedHomestayCount(assignedHomestayIds.length);

      const assignedSet = new Set(assignedHomestayIds.map((id) => normalizeId(id)).filter(Boolean));
      if (assignedSet.size === 0) {
        setTickets([]);
        return;
      }

      const directScoped = list.filter((ticket) => assignedSet.has(normalizeId(ticket.homestayId)));
      const unresolved = list.filter((ticket) => !normalizeId(ticket.homestayId));

      const resolvedUnresolved = await Promise.all(
        unresolved.map(async (ticket) => {
          try {
            const homestayId = await resolveTicketHomestayId(ticket);
            return assignedSet.has(normalizeId(homestayId)) ? ticket : null;
          } catch {
            return null;
          }
        }),
      );

      const resolvedScoped = resolvedUnresolved.filter((item): item is StaffTicket => Boolean(item));
      const merged = [...directScoped, ...resolvedScoped];
      const uniqueById = Array.from(new Map(merged.map((ticket) => [ticket.id, ticket])).values());
      setTickets(uniqueById);
    } catch (error) {
      console.error('Load staff tickets error:', error);
      toast.error('Không thể tải danh sách ticket');
    } finally {
      setLoading(false);
    }
  }, [resolveAssignedHomestayIds, resolveTicketHomestayId]);

  const loadDetail = useCallback(async (ticketId: string) => {
    try {
      setDetailLoading(true);
      const detail = await staffTicketService.getDetail(ticketId);
      setSelectedTicket(detail);
      setNextStatus(detail?.status ?? 'OPEN');
      setReplyMessage('');
    } catch (error) {
      console.error('Load staff ticket detail error:', error);
      setSelectedTicket(null);
      toast.error('Không thể tải chi tiết ticket');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const filteredTickets = useMemo(() => {
    let list = [...tickets];

    if (filterStatus !== 'all') {
      list = list.filter((ticket) => ticket.status === filterStatus);
    }

    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      list = list.filter((ticket) => {
        return (
          (ticket.ticketNumber || '').toLowerCase().includes(query) ||
          ticket.title.toLowerCase().includes(query) ||
          ticket.customerName.toLowerCase().includes(query) ||
          (ticket.customerEmail || '').toLowerCase().includes(query) ||
          (ticket.description || '').toLowerCase().includes(query)
        );
      });
    }

    return list;
  }, [tickets, filterStatus, searchTerm]);

  useEffect(() => {
    if (filteredTickets.length === 0) {
      if (selectedTicketId !== null) {
        setSelectedTicketId(null);
        setSelectedTicket(null);
      }
      return;
    }

    const stillVisible = selectedTicketId && filteredTickets.some((ticket) => ticket.id === selectedTicketId);
    if (!stillVisible) {
      setSelectedTicketId(filteredTickets[0].id);
    }
  }, [filteredTickets, selectedTicketId]);

  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicket(null);
      setReplyMessage('');
      return;
    }

    void loadDetail(selectedTicketId);
  }, [loadDetail, selectedTicketId]);

  const selectedSummary = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId],
  );
  const activeTicket = selectedTicket ?? selectedSummary;
  const activeDetail = selectedTicket;
  const activeReplies = activeDetail?.replies ?? [];
  const activeStatus = activeTicket?.status ?? 'OPEN';
  const isClosed = activeStatus === 'CLOSED';

  useEffect(() => {
    const container = document.getElementById('staff-ticket-messages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [activeReplies.length, selectedTicketId, detailLoading]);

  useEffect(() => {
    const token = authService.getToken();
    if (!token) return;

    let isMounted = true;
    let unsubscribe = () => {};

    signalRService.connect(token).then((conn) => {
      if (!isMounted || !conn) return;

      if (currentUser?.id) {
        conn.invoke('JoinUserGroup', currentUser.id).catch(() => {});
        conn.invoke('JoinStaffGroup', currentUser.id).catch(() => {});
      }

      if (selectedTicketId) {
        conn.invoke('JoinTicketGroup', selectedTicketId).catch(() => {});
        conn.invoke('JoinSupportTicketGroup', selectedTicketId).catch(() => {});
      }

      unsubscribe = subscribeTicketRealtimeEvents(conn, (event) => {
        if (!event.isTicketEvent) return;

        if (realtimeRefreshTimerRef.current !== null) {
          window.clearTimeout(realtimeRefreshTimerRef.current);
        }

        realtimeRefreshTimerRef.current = window.setTimeout(() => {
          if (!isMounted) return;

          const shouldRefreshDetail = !!selectedTicketId && (!event.ticketId || event.ticketId === selectedTicketId);
          void loadTickets();
          if (shouldRefreshDetail && selectedTicketId) {
            void loadDetail(selectedTicketId);
          }
        }, 250);
      });
    }).catch(() => {});

    return () => {
      isMounted = false;
      unsubscribe();
      if (realtimeRefreshTimerRef.current !== null) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
    };
  }, [currentUser?.id, loadDetail, loadTickets, selectedTicketId]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((item) => item.status === 'OPEN').length,
      inProgress: tickets.filter((item) => item.status === 'IN_PROGRESS').length,
      resolved: tickets.filter((item) => item.status === 'RESOLVED').length,
      closed: tickets.filter((item) => item.status === 'CLOSED').length,
    };
  }, [tickets]);

  const getStatusBadgeClass = (status: StaffTicketStatus) => {
    if (status === 'OPEN') return 'bg-blue-100 text-blue-700';
    if (status === 'IN_PROGRESS') return 'bg-yellow-100 text-yellow-700';
    if (status === 'RESOLVED') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status: StaffTicketStatus) => {
    if (status === 'OPEN') return 'Mở';
    if (status === 'IN_PROGRESS') return 'Đang xử lý';
    if (status === 'RESOLVED') return 'Đã giải quyết';
    return 'Đã đóng';
  };

  const handleAssign = async (ticketId: string) => {
    try {
      setSaving(true);
      const result = await staffTicketService.assign(ticketId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      await loadTickets();
      if (selectedTicketId === ticketId) {
        await loadDetail(ticketId);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReply = async () => {
    if (!selectedTicketId || !replyMessage.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }

    try {
      setSaving(true);
      const result = await staffTicketService.reply(selectedTicketId, replyMessage.trim());
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setReplyMessage('');
      await loadTickets();
      await loadDetail(selectedTicketId);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedTicketId) return;

    try {
      setSaving(true);
      const result = await staffTicketService.updateStatus(selectedTicketId, nextStatus);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      await loadTickets();
      await loadDetail(selectedTicketId);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    toast.success('Đăng xuất thành công!');
    navigate('/auth/login');
  };

  const showList = !selectedTicketId;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-br from-cyan-600 to-blue-700 text-white transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg">CHMS</h1>
                <p className="text-xs text-cyan-200">Staff Portal</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden" type="button">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  type="button"
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    item.active ? 'bg-white/20 text-white font-medium' : 'text-cyan-100 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-6 border-t border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {currentUser?.name?.charAt(0)?.toUpperCase() ?? 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{currentUser?.name ?? 'Staff'}</p>
                <RoleBadge role={currentUser?.role || 'staff'} size="md" />
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-cyan-500/30">
            <button
              onClick={handleLogout}
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-cyan-100 hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg" type="button">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Staff Tickets</h2>
                <p className="text-sm text-gray-500">Xử lý ticket hỗ trợ theo dạng chat giữa 2 vai trò</p>
              </div>
            </div>
            <BackofficeNotificationBell />
          </div>
        </header>

        <main className="p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Tổng cộng</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
              <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
              <p className="text-sm text-gray-600">Mở</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-yellow-100">
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              <p className="text-sm text-gray-600">Đang xử lý</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-green-100">
              <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
              <p className="text-sm text-gray-600">Đã giải quyết</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{stats.closed}</p>
              <p className="text-sm text-gray-600">Đã đóng</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm ticket..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="OPEN">Mở</option>
                <option value="IN_PROGRESS">Đang xử lý</option>
                <option value="RESOLVED">Đã giải quyết</option>
                <option value="CLOSED">Đã đóng</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 100px)', minHeight: 840 }}>
            <div className="flex h-full">
              <div className={`flex flex-col border-r border-gray-100 flex-shrink-0 w-full lg:w-96 ${showList ? 'flex' : 'hidden'} lg:flex`}>
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Danh sách ticket</p>
                    <p className="text-xs text-gray-500">Chỉ hiển thị ticket thuộc homestay bạn được phân công ({assignedHomestayCount})</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{filteredTickets.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-12">
                      <MessageSquare className="w-10 h-10 text-gray-200" />
                      <p className="text-sm text-gray-400">Không có ticket phù hợp.</p>
                    </div>
                  ) : (
                    filteredTickets.map((ticket) => {
                      const isSelected = selectedTicketId === ticket.id;
                      return (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => setSelectedTicketId(ticket.id)}
                          className={`w-full text-left px-4 py-3.5 border-b border-gray-50 border-l-4 transition-all ${
                            isSelected ? 'bg-cyan-50 border-l-cyan-500' : 'border-l-transparent hover:bg-gray-50/80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <p className={`text-sm font-medium line-clamp-1 flex-1 ${isSelected ? 'text-cyan-700' : 'text-gray-900'}`}>
                              {ticket.title || '(Không tiêu đề)'}
                            </p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadgeClass(ticket.status)}`}>
                              {getStatusText(ticket.status)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">{ticket.ticketNumber || ticket.id}</p>
                          <p className="text-xs text-gray-600 line-clamp-1">Khách hàng: {ticket.customerName || '-'}</p>
                          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-400">
                            <span>Ưu tiên: {ticket.priority}</span>
                            <span>{formatTime(ticket.createdAt)}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col">
                {!selectedTicketId ? (
                  <div className="flex-1 flex items-center justify-center px-6 text-center">
                    <div className="max-w-sm">
                      <MessageSquare className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                      <p className="text-lg font-semibold text-gray-900">Chọn một ticket để bắt đầu chat</p>
                      <p className="text-sm text-gray-500 mt-1">Khung bên phải sẽ hiển thị nội dung, lịch sử nhắn tin và các thao tác xử lý.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
                      <button
                        onClick={() => setSelectedTicketId(null)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors lg:hidden flex-shrink-0"
                        aria-label="Quay lại danh sách"
                        type="button"
                      >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                      </button>

                      {detailLoading ? (
                        <div className="flex-1 space-y-2">
                          <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
                          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                        </div>
                      ) : activeTicket ? (
                        <>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{activeTicket.title || '(Không tiêu đề)'}</h3>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadgeClass(activeStatus)}`}>
                                {getStatusText(activeStatus)}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                                {activeTicket.priority}
                              </span>
                              <span className="text-xs text-gray-400">{activeTicket.ticketNumber || activeTicket.id}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleAssign(activeTicket.id)}
                            disabled={saving}
                            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-cyan-200 text-cyan-700 hover:bg-cyan-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Nhận ticket
                          </button>
                        </>
                      ) : (
                        <div className="flex-1 h-5 bg-gray-100 rounded animate-pulse" />
                      )}
                    </div>

                    {detailLoading ? (
                      <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                      </div>
                    ) : !activeTicket ? (
                      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Không tải được dữ liệu.</div>
                    ) : (
                      <>
                        <div className="px-5 pt-4 pb-3 bg-gray-50/60 border-b border-gray-100 flex-shrink-0 space-y-4">
                          <StatusTimeline status={activeStatus} />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl border border-gray-100 bg-white p-3">
                              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Khách hàng</p>
                              <p className="font-medium text-gray-900">{activeTicket.customerName || '-'}</p>
                              <p className="text-xs text-gray-500">{activeTicket.customerEmail || '-'}</p>
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-white p-3">
                              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Nhân viên phụ trách</p>
                              <p className="font-medium text-gray-900">{activeTicket.staffName || 'Chưa có'}</p>
                              <p className="text-xs text-gray-500">{activeDetail?.bookingId ? `Booking: ${activeDetail.bookingId}` : 'Không gắn booking'}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3 items-start">
                            <div className="rounded-xl border border-gray-100 bg-white p-3">
                              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Mô tả vấn đề</p>
                              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{activeTicket.description || 'Không có mô tả'}</p>
                              {activeTicket.attachmentUrl && (
                                <div className="mt-3">
                                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Ảnh đính kèm</p>
                                  <a href={activeTicket.attachmentUrl} target="_blank" rel="noreferrer" className="inline-block">
                                    <img
                                      src={activeTicket.attachmentUrl}
                                      alt="Ảnh ticket"
                                      className="h-24 w-24 rounded-lg object-cover border border-white shadow-sm hover:opacity-90 transition-opacity"
                                    />
                                  </a>
                                </div>
                              )}
                            </div>

                            <div className="rounded-xl border border-gray-100 bg-white p-3 space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Cập nhật trạng thái</label>
                                <select
                                  value={nextStatus}
                                  onChange={(e) => setNextStatus(e.target.value as StaffTicketStatus)}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500"
                                >
                                  <option value="OPEN">Mở</option>
                                  <option value="IN_PROGRESS">Đang xử lý</option>
                                  <option value="RESOLVED">Đã giải quyết</option>
                                  <option value="CLOSED">Đã đóng</option>
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={handleUpdateStatus}
                                disabled={saving}
                                className="w-full px-3 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Lưu trạng thái
                              </button>
                            </div>
                          </div>
                        </div>

                        <div id="staff-ticket-messages" className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                          {activeReplies.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                              <MessageSquare className="w-10 h-10 text-gray-200" />
                              <p className="text-sm text-gray-400">Chưa có tin nhắn nào. Hãy phản hồi để bắt đầu trao đổi.</p>
                            </div>
                          ) : (
                            activeReplies.map((reply: StaffTicketReply) => {
                              const isMe = reply.senderId?.toLowerCase() === currentUser?.id?.toLowerCase();
                              return (
                                <div key={reply.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                      isMe ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                                    }`}
                                  >
                                    {reply.senderName?.[0]?.toUpperCase() ?? '?'}
                                  </div>
                                  <div
                                    className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${
                                      isMe
                                        ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white rounded-br-sm'
                                        : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
                                    }`}
                                  >
                                    {!isMe && <p className="text-xs font-medium mb-0.5 text-cyan-600">{reply.senderName}</p>}
                                    <p className="whitespace-pre-wrap break-words leading-relaxed">{reply.message}</p>
                                    <p className={`text-[10px] mt-1 ${isMe ? 'text-cyan-100 text-right' : 'text-gray-400'}`}>
                                      {formatTime(reply.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0">
                          {isClosed ? (
                            <p className="text-center text-sm text-gray-400 py-1">Ticket này đã đóng.</p>
                          ) : (
                            <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition-all">
                              <textarea
                                rows={1}
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    void handleReply();
                                  }
                                }}
                                placeholder="Nhập phản hồi..."
                                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none max-h-24 leading-relaxed"
                                style={{ minHeight: 24 }}
                              />
                              <button
                                type="button"
                                onClick={() => void handleReply()}
                                disabled={!replyMessage.trim() || saving}
                                className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                              >
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
