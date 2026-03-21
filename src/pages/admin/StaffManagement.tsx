import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  UserCheck,
  Calendar,
  Phone,
  Mail,
  Building2,
  AlertCircle,
  X,
  Menu,
  LogOut,
  LayoutDashboard,
  Home,
  CalendarDays,
  Sparkles,
  UserCog,
  TrendingUp,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/authService';
import { employeeService } from '../../services/employeeService';
import type { Staff, StaffRole, StaffStatus } from '../../types/staff.types';
import { RoleBadge } from '../../components/common/RoleBadge';
import { CreateStaffModal } from '../../components/admin/CreateStaffModal';
import { EditStaffModal } from '../../components/admin/EditStaffModal';

const normalizeStatus = (value?: string): StaffStatus => {
  const raw = (value || '').toLowerCase();
  if (raw === 'active') return 'active';
  if (raw === 'on_leave' || raw === 'onleave' || raw === 'leave') return 'on_leave';
  return 'inactive';
};

const normalizeRole = (value?: string): StaffRole => {
  const raw = (value || '').toLowerCase();
  if (raw === 'admin') return 'admin';
  if (raw === 'manager') return 'manager';
  return 'staff';
};

const mapEmployeeToStaff = (item: any): Staff => {
  const role = normalizeRole(item.role || item.roleName);
  return {
    id: String(item.id || item.userId || ''),
    name: String(item.fullName || item.name || item.username || 'Unknown'),
    email: String(item.email || ''),
    phone: String(item.phoneNumber || item.phone || ''),
    role,
    status: normalizeStatus(item.status || (item.isActive === false ? 'inactive' : 'active')),
    department: String(item.department || 'Vận hành'),
    position: String(item.position || (role === 'manager' ? 'Quản lý' : 'Nhân viên')),
    hireDate: String(item.hireDate || item.createdAt || new Date().toISOString()),
    avatar: item.avatarUrl || item.avatar,
    assignedHomestays: Array.isArray(item.assignedHomestays)
      ? item.assignedHomestays.map((x: any) => String(x))
      : [],
  };
};

export default function StaffManagement() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<StaffRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StaffStatus | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    onLeave: 0,
    inactive: 0,
    managers: 0,
    staff: 0,
  });

  const user = authService.getCurrentUser();

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    let filtered = [...staff];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.phone.toLowerCase().includes(query) ||
          s.department.toLowerCase().includes(query) ||
          s.position.toLowerCase().includes(query),
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((s) => s.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    setFilteredStaff(filtered);
  }, [staff, searchQuery, roleFilter, statusFilter]);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const employees = await employeeService.getEmployees();
      const mapped = employees.map(mapEmployeeToStaff).filter((x) => Boolean(x.id));
      setStaff(mapped);
      setStats({
        total: mapped.length,
        active: mapped.filter((s) => s.status === 'active').length,
        onLeave: mapped.filter((s) => s.status === 'on_leave').length,
        inactive: mapped.filter((s) => s.status === 'inactive').length,
        managers: mapped.filter((s) => s.role === 'manager' || s.role === 'admin').length,
        staff: mapped.filter((s) => s.role === 'staff').length,
      });
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (staffMember: Staff) => {
    const result = await employeeService.deleteEmployee(staffMember.id);
    if (result?.success) {
      toast.success('Xóa nhân viên thành công');
      loadStaff();
      setDeletingStaff(null);
    } else {
      toast.error(result?.message || 'Không thể xóa nhân viên');
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  const handleStaffCreated = () => {
    loadStaff();
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setEditingStaff(null);
  };

  const getStatusBadge = (status: StaffStatus) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      on_leave: 'bg-orange-100 text-orange-700',
    };

    const labels = {
      active: 'Đang làm việc',
      inactive: 'Ngừng làm việc',
      on_leave: 'Nghỉ phép',
    };

    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  const getRoleBadge = (role: StaffRole) => {
    const styles = {
      admin: 'bg-red-100 text-red-700',
      manager: 'bg-blue-100 text-blue-700',
      staff: 'bg-purple-100 text-purple-700',
    };

    const labels = {
      admin: 'Quản trị viên',
      manager: 'Quản lý',
      staff: 'Nhân viên',
    };

    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[role]}`}>{labels[role]}</span>;
  };

  const navItems = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, path: '/admin/dashboard' },
    { id: 'homestays', label: 'Quản lý Homestay', icon: Home, path: '/admin/homestays' },
    { id: 'amenities', label: 'Quản lý tiện ích', icon: Sparkles, path: '/admin/amenities' },
    { id: 'bookings', label: 'Đơn đặt phòng', icon: CalendarDays, path: '/admin/bookings' },
    { id: 'customers', label: 'Khách hàng', icon: Users, path: '/admin/customers' },
    { id: 'staff', label: 'Nhân viên', icon: UserCog, path: '/admin/staff' },
    { id: 'revenue', label: 'Doanh thu', icon: TrendingUp, path: '/admin/revenue' },
    { id: 'settings', label: 'Cài đặt', icon: Settings, path: '/admin/settings' },
  ];

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
            const isActive = item.id === 'staff';
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
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.name}</p>
              <div className="mt-1">{user?.role && <RoleBadge role={user.role} size="sm" />}</div>
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
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Quản lý Nhân viên</h2>
                <p className="text-gray-600 text-sm">Quản lý thông tin nhân viên và phân quyền</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingStaff(null);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Thêm nhân viên</span>
            </button>
          </div>
        </header>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Tổng nhân viên</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Đang làm việc</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Nghỉ phép</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.onLeave}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Quản lý</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.managers}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <UserCog className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên, email, số điện thoại..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as StaffRole | 'all')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="admin">Quản trị viên</option>
                  <option value="manager">Quản lý</option>
                  <option value="staff">Nhân viên</option>
                </select>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StaffStatus | 'all')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang làm việc</option>
                  <option value="on_leave">Nghỉ phép</option>
                  <option value="inactive">Ngừng làm việc</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                <span>Xuất Excel</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Upload className="w-4 h-4" />
                <span>Nhập Excel</span>
              </button>
              <div className="ml-auto text-sm text-gray-600">
                Hiển thị <span className="font-semibold">{filteredStaff.length}</span> / {stats.total} nhân viên
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải danh sách nhân viên...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Không tìm thấy nhân viên nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredStaff.map((staffMember) => (
                <div key={staffMember.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {staffMember.avatar ? (
                          <img
                            src={staffMember.avatar}
                            alt={staffMember.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
                            {staffMember.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">{staffMember.name}</h3>
                          </div>
                          <div className="flex flex-col gap-2">
                            {getRoleBadge(staffMember.role)}
                            {getStatusBadge(staffMember.status)}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 mb-4">
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span>{staffMember.department}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="truncate">{staffMember.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{staffMember.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>Vào làm: {new Date(staffMember.hireDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Home className="w-4 h-4 text-gray-400" />
                            <span>Quản lý {staffMember.assignedHomestays.length} homestay</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingStaff(staffMember);
                              setIsEditModalOpen(true);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Sửa</span>
                          </button>
                          <button
                            onClick={() => setDeletingStaff(staffMember)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {isCreateModalOpen && (
        <CreateStaffModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
          }}
          onSuccess={handleStaffCreated}
        />
      )}

      {isEditModalOpen && (
        <EditStaffModal
          isOpen={isEditModalOpen}
          staff={editingStaff}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingStaff(null);
          }}
          onSuccess={handleStaffCreated}
        />
      )}

      {deletingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Xác nhận xóa</h3>
                <p className="text-gray-600 text-sm">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Bạn có chắc chắn muốn xóa nhân viên <strong>{deletingStaff.name}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeletingStaff(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deletingStaff)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
