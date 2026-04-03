import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Building2,
  Menu,
  X,
  MessageSquare,
  Search,
  Filter,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { RoleBadge } from '../../components/common/RoleBadge';
import { authService } from '../../services/authService';
import { adminTicketService } from '../../services/adminTicketService';
import { adminNavItems } from '../../config/adminNavItems';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type FilterStatus = 'all' | TicketStatus;

type AdminTicket = {
  id: string;
  title: string;
  description?: string;
  ticketNumber?: string;
  customerName: string;
  customerEmail?: string;
  staffName?: string;
  priority: string;
  status: TicketStatus;
  category?: string;
  createdAt: string;
};

type TicketStats = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
};

const toArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  return [];
};

const normalizeStatus = (raw: any): TicketStatus => {
  const value = String(raw || 'OPEN').toUpperCase();
  if (value === 'IN_PROGRESS' || value === 'IN-PROGRESS') return 'IN_PROGRESS';
  if (value === 'RESOLVED') return 'RESOLVED';
  if (value === 'CLOSED') return 'CLOSED';
  return 'OPEN';
};

const normalizeTicket = (raw: any): AdminTicket => ({
  id: String(raw?.id || ''),
  title: String(raw?.title || raw?.subject || ''),
  description: raw?.description ? String(raw.description) : undefined,
  ticketNumber: raw?.ticketNumber ? String(raw.ticketNumber) : undefined,
  customerName: String(raw?.customerName || ''),
  customerEmail: raw?.customerEmail ? String(raw.customerEmail) : undefined,
  staffName: raw?.staffName ? String(raw.staffName) : undefined,
  priority: String(raw?.priority || 'NORMAL'),
  status: normalizeStatus(raw?.status),
  category: raw?.category ? String(raw.category) : undefined,
  createdAt: String(raw?.createdAt || new Date().toISOString()),
});

const normalizeStats = (raw: any): TicketStats => {
  const data = raw?.data ?? raw ?? {};
  return {
    total: Number(data.total ?? data.Total ?? 0),
    open: Number(data.open ?? data.OPEN ?? 0),
    inProgress: Number(data.inProgress ?? data.in_progress ?? data.IN_PROGRESS ?? 0),
    resolved: Number(data.resolved ?? data.RESOLVED ?? 0),
    closed: Number(data.closed ?? data.CLOSED ?? 0),
  };
};

export default function TicketManagement() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const navItems = adminNavItems;

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        adminTicketService.list(),
        adminTicketService.statistics(),
      ]);

      const list = toArray(listRes).map(normalizeTicket).filter((item) => item.id);
      setTickets(list);
      setStats(normalizeStats(statsRes));
    } catch (error) {
      console.error('Error loading admin tickets:', error);
      toast.error('Không thể tải dữ liệu tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredTickets = useMemo(() => {
    let list = [...tickets];

    if (filterStatus !== 'all') {
      list = list.filter((item) => item.status === filterStatus);
    }

    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      list = list.filter((item) => {
        return (
          item.title.toLowerCase().includes(query) ||
          item.customerName.toLowerCase().includes(query) ||
          (item.customerEmail || '').toLowerCase().includes(query) ||
          (item.ticketNumber || '').toLowerCase().includes(query) ||
          (item.description || '').toLowerCase().includes(query)
        );
      });
    }

    return list;
  }, [tickets, filterStatus, searchTerm]);

  const getStatusBadge = (status: TicketStatus) => {
    if (status === 'OPEN') {
      return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Open</span>;
    }
    if (status === 'IN_PROGRESS') {
      return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">In Progress</span>;
    }
    if (status === 'RESOLVED') {
      return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Resolved</span>;
    }
    return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">Closed</span>;
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-white shadow-lg w-64`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-900">CHMS Admin</h1>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'tickets';

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
              {(currentUser?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{currentUser?.name || 'Admin'}</p>
              <div className="mt-1">
                <RoleBadge role={currentUser?.role || 'admin'} size="sm" />
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className={`transition-all ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <header className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Quản lý Ticket hỗ trợ</h2>
                <p className="text-sm text-gray-500">Danh sách phản hồi hỗ trợ từ khách hàng</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-600">Đang tải ticket...</p>
            </div>
          ) : (
            <>
              <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <MessageSquare className="w-7 h-7 text-gray-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-sm text-gray-600">Tổng ticket</p>
                </div>

                <div className="bg-white rounded-xl border border-blue-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <AlertCircle className="w-7 h-7 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
                  <p className="text-sm text-gray-600">Open</p>
                </div>

                <div className="bg-white rounded-xl border border-yellow-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-7 h-7 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                  <p className="text-sm text-gray-600">In Progress</p>
                </div>

                <div className="bg-white rounded-xl border border-green-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
                  <p className="text-sm text-gray-600">Resolved</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="w-7 h-7 text-gray-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.closed}</p>
                  <p className="text-sm text-gray-600">Closed</p>
                </div>
              </section>

              <section className="bg-white rounded-xl border p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tìm theo tiêu đề, khách hàng, email, mã ticket..."
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-xl border overflow-hidden">
                {filteredTickets.length === 0 ? (
                  <div className="p-10 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-900 font-medium">Không có ticket phù hợp</p>
                    <p className="text-gray-500 text-sm mt-1">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Mã</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Tiêu đề</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Khách hàng</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Ưu tiên</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Nhân viên xử lý</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Thời gian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTickets.map((ticket) => (
                          <tr key={ticket.id} className="border-b border-gray-100 hover:bg-gray-50 align-top">
                            <td className="px-4 py-3 text-sm text-gray-700">{ticket.ticketNumber || ticket.id.slice(0, 8)}</td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-gray-900">{ticket.title || '(Không có tiêu đề)'}</p>
                              {ticket.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ticket.description}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-gray-900">{ticket.customerName || '-'}</p>
                              {ticket.customerEmail && <p className="text-xs text-gray-500">{ticket.customerEmail}</p>}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{ticket.priority}</td>
                            <td className="px-4 py-3">{getStatusBadge(ticket.status)}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{ticket.staffName || 'Chưa phân công'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{new Date(ticket.createdAt).toLocaleString('vi-VN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
