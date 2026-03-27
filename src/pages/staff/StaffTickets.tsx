import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  CheckCircle2,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Ticket,
  UserCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { RoleBadge } from '../../components/common/RoleBadge';
import { authService } from '../../services/authService';
import {
  staffTicketService,
  type StaffTicket,
  type StaffTicketStatus,
} from '../../services/staffTicketService';

type FilterStatus = 'all' | StaffTicketStatus;

export default function StaffTickets() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedTicket, setSelectedTicket] = useState<StaffTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [nextStatus, setNextStatus] = useState<StaffTicketStatus>('IN_PROGRESS');

  const navigationItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/staff/dashboard', active: false },
    { name: 'Bookings', icon: Calendar, path: '/staff/bookings', active: false },
    { name: 'Reviews', icon: MessageSquare, path: '/staff/reviews', active: false },
    { name: 'Tickets', icon: Ticket, path: '/staff/tickets', active: true },
  ];

  const loadTickets = async () => {
    try {
      setLoading(true);
      const list = await staffTicketService.list();
      setTickets(list);
    } catch (error) {
      console.error('Load staff tickets error:', error);
      toast.error('Không thể tải danh sách ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

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
    if (status === 'OPEN') return 'Open';
    if (status === 'IN_PROGRESS') return 'In Progress';
    if (status === 'RESOLVED') return 'Resolved';
    return 'Closed';
  };

  const openTicketDetail = (ticket: StaffTicket) => {
    setSelectedTicket(ticket);
    setReplyMessage('');
    setNextStatus(ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status);
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
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, staffName: currentUser?.name || prev.staffName } : prev));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket) return;
    if (!replyMessage.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }

    try {
      setSaving(true);
      const result = await staffTicketService.reply(selectedTicket.id, replyMessage.trim());
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setReplyMessage('');
      await loadTickets();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedTicket) return;

    try {
      setSaving(true);
      const result = await staffTicketService.updateStatus(selectedTicket.id, nextStatus);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      await loadTickets();
      setSelectedTicket((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    toast.success('Đăng xuất thành công!');
    navigate('/auth/login');
  };

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

          <div className="p-6 border-b border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {currentUser?.name?.charAt(0)?.toUpperCase() ?? 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{currentUser?.name ?? 'Staff'}</p>
                <RoleBadge role={currentUser?.role || 'staff'} size="sm" />
              </div>
            </div>
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
                <p className="text-sm text-gray-500">Xử lý ticket hỗ trợ từ khách hàng</p>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg relative" type="button">
              <Bell className="w-6 h-6 text-gray-600" />
              {stats.open > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </button>
          </div>
        </header>

        <main className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
              <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
              <p className="text-sm text-gray-600">Open</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-yellow-100">
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-green-100">
              <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
              <p className="text-sm text-gray-600">Resolved</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{stats.closed}</p>
              <p className="text-sm text-gray-600">Closed</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
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
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">Đang tải...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-900 font-medium">Không có ticket phù hợp</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{ticket.title || '(Không tiêu đề)'}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(ticket.status)}`}>
                          {getStatusText(ticket.status)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">{ticket.ticketNumber || ticket.id}</p>
                      <p className="text-sm text-gray-700 mb-1">Khách hàng: {ticket.customerName || '-'}</p>
                      <p className="text-sm text-gray-700 mb-1">Email: {ticket.customerEmail || '-'}</p>
                      <p className="text-sm text-gray-700 mb-1">Ưu tiên: {ticket.priority}</p>
                      <p className="text-sm text-gray-700 mb-1">Nhân viên xử lý: {ticket.staffName || 'Chưa có'}</p>
                      {ticket.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{ticket.description}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleAssign(ticket.id)}
                        disabled={saving}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center gap-1"
                      >
                        <UserCheck className="w-4 h-4" /> Nhận xử lý
                      </button>

                      <button
                        type="button"
                        onClick={() => openTicketDetail(ticket)}
                        className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-700"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Chi tiết Ticket</h3>
                <p className="text-sm text-gray-500">{selectedTicket.ticketNumber || selectedTicket.id}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-gray-100 rounded-lg" type="button">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Tiêu đề</p>
                <p className="font-medium text-gray-900">{selectedTicket.title || '(Không tiêu đề)'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Mô tả</p>
                <p className="text-gray-800 whitespace-pre-wrap">{selectedTicket.description || 'Không có mô tả'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Cập nhật trạng thái</label>
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as StaffTicketStatus)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleUpdateStatus}
                    disabled={saving}
                    className="mt-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-60 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Lưu trạng thái
                  </button>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Nhận xử lý ticket</label>
                  <button
                    type="button"
                    onClick={() => void handleAssign(selectedTicket.id)}
                    disabled={saving}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-1"
                  >
                    <UserCheck className="w-4 h-4" /> Assign cho tôi
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Phản hồi</label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={4}
                  placeholder="Nhập nội dung phản hồi..."
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                />
                <button
                  type="button"
                  onClick={handleReply}
                  disabled={saving || !replyMessage.trim()}
                  className="mt-2 px-3 py-2 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-700 disabled:opacity-60"
                >
                  Gửi phản hồi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
