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
  UserCog,
  TrendingUp,
  MapPin,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/authService';
import { employeeService } from '../../services/employeeService';
import { adminRoleService } from '../../services/adminRoleService';
import { locationService } from '../../services/locationService';
import { districtService } from '../../services/districtService';
import { adminNavItems } from '../../config/adminNavItems';
import { homestayService } from '../../services/homestayService';
import type { Staff, StaffRole, StaffStatus } from '../../types/staff.types';
import type { Role } from '../../types/role.types';
import type { Homestay } from '../../types/homestay.types';
import { RoleBadge } from '../../components/common/RoleBadge';
import { CreateStaffModal } from '../../components/admin/CreateStaffModal';
import { EditStaffModal } from '../../components/admin/EditStaffModal';

type ProvinceOption = {
  id: string;
  name: string;
};

type HomestayOption = {
  id: string;
  name: string;
  provinceName?: string;
};

const normalizeText = (value?: string) => String(value || '').trim().toLowerCase();

const toArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return [];
    if (raw.includes(',')) {
      return raw
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    }
    return [raw];
  }
  if (value && typeof value === 'object') return [value];
  return [];
};

const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

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
  const assignedHomestaySource = [
    ...toArray(item.assignedHomestays),
    ...toArray(item.managedHomestays),
    ...toArray(item.homestays),
    ...toArray(item.assignedHomestayIds),
    ...toArray(item.managedHomestayIds),
    ...toArray(item.homestayIds),
    ...toArray(item.assignedHomestayId),
    ...toArray(item.managedHomestayId),
    ...toArray(item.homestayId),
    ...toArray(item.homestayAssignments),
    ...toArray(item.assignments),
  ];

  const assignedHomestayNameSource = [
    ...toArray(item.assignedHomestayNames),
    ...toArray(item.managedHomestayNames),
    ...toArray(item.homestayNames),
    ...toArray(item.homestaysName),
  ];

  const assignedHomestays = uniqueStrings(
    assignedHomestaySource
    .map((x: any) => String(x?.homestayId || x?.id || x?.homestay?.id || x))
    .filter(Boolean),
  );

  const assignedHomestayNames = uniqueStrings(
    [...assignedHomestaySource, ...assignedHomestayNameSource]
      .map((x: any) => String(x?.homestayName || x?.name || x?.homestay?.name || x || '').trim())
      .filter(Boolean),
  );

  const assignedProvinceId =
    item.managedProvinceId ||
    item.assignedProvinceId ||
    item.managedProvince?.id ||
    item.assignedProvince?.id ||
    item.provinceId;
  const assignedProvinceName =
    item.managedProvinceName ||
    item.assignedProvinceName ||
    item.managedProvince?.name ||
    item.assignedProvince?.name ||
    item.provinceName ||
    item.assignedProvince ||
    item.province?.name;

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
    assignedProvinceId: assignedProvinceId ? String(assignedProvinceId) : undefined,
    assignedProvinceName: assignedProvinceName ? String(assignedProvinceName) : undefined,
    assignedHomestays,
    assignedHomestayNames,
  };
};

const mapRoleItem = (item: any): Role => ({
  id: String(item?.id || ''),
  name: String(item?.name || item?.roleName || ''),
  description: item?.description ? String(item.description) : '',
  isSystemRole: Boolean(item?.isSystemRole),
  createdAt: item?.createdAt,
  updatedAt: item?.updatedAt,
});

const enrichStaffAssignments = (staffList: Staff[], homestayList: HomestayOption[]): Staff[] => {
  if (!homestayList.length) return staffList;

  return staffList.map((member) => {
    if (member.role !== 'staff') return member;

    const namesFromIds = (member.assignedHomestays || [])
      .map((id) => homestayList.find((h) => h.id === id)?.name)
      .filter((name): name is string => Boolean(name));

    const allNames = uniqueStrings([...(member.assignedHomestayNames || []), ...namesFromIds]);

    return {
      ...member,
      assignedHomestayNames: allNames,
    };
  });
};

type StaffManagementProps = {
  mode?: 'admin' | 'manager';
};

export default function StaffManagement({ mode = 'admin' }: StaffManagementProps) {
  const navigate = useNavigate();
  const isManagerMode = mode === 'manager';
  const isAdminMode = mode === 'admin';
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
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [provinceOptions, setProvinceOptions] = useState<ProvinceOption[]>([]);
  const [homestayOptions, setHomestayOptions] = useState<HomestayOption[]>([]);
  const [assigningStaff, setAssigningStaff] = useState<Staff | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedHomestayIds, setSelectedHomestayIds] = useState<string[]>([]);
  const [assigningSubmitting, setAssigningSubmitting] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [managerScopeProvinceName, setManagerScopeProvinceName] = useState('');

  const user = authService.getCurrentUser();

  useEffect(() => {
    void loadStaff();
    if (isAdminMode) {
      void loadRoles();
    }
    void loadAssignmentData();
  }, [isAdminMode]);

  useEffect(() => {
    let filtered = [...staff];

    if (isManagerMode) {
      filtered = filtered.filter((s) => s.role === 'staff');

      const scopeProvince = normalizeText(managerScopeProvinceName);
      if (!scopeProvince) {
        filtered = [];
      } else {
        filtered = filtered.filter((s) => {
          const hasSameAssignedProvince = normalizeText(s.assignedProvinceName) === scopeProvince;

          const hasSameHomestayProvince = (s.assignedHomestays || []).some((id) => {
            const homestay = homestayOptions.find((h) => h.id === id);
            return normalizeText(homestay?.provinceName) === scopeProvince;
          });

          return hasSameAssignedProvince || hasSameHomestayProvince;
        });
      }
    }

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
  }, [staff, searchQuery, roleFilter, statusFilter, isManagerMode, managerScopeProvinceName, homestayOptions]);

  const getManagerScopedStaff = (list: Staff[]) => {
    let scoped = [...list].filter((s) => s.role === 'staff');
    const scopeProvince = normalizeText(managerScopeProvinceName);
    if (!scopeProvince) return [];

    return scoped.filter((s) => {
      const hasSameAssignedProvince = normalizeText(s.assignedProvinceName) === scopeProvince;
      const hasSameHomestayProvince = (s.assignedHomestays || []).some((id) => {
        const homestay = homestayOptions.find((h) => h.id === id);
        return normalizeText(homestay?.provinceName) === scopeProvince;
      });
      return hasSameAssignedProvince || hasSameHomestayProvince;
    });
  };

  const loadStaff = async () => {
    setLoading(true);
    try {
      const employees = await employeeService.getEmployees();
      const mapped = employees.map(mapEmployeeToStaff).filter((x) => Boolean(x.id));
      const enriched = enrichStaffAssignments(mapped, homestayOptions);

      if (isManagerMode) {
        const currentUserId = String(user?.id || '').toLowerCase();
        const currentUserEmail = String(user?.email || '').toLowerCase();

        const me = enriched.find(
          (item) =>
            (item.role === 'manager' || item.role === 'admin') &&
            (String(item.id || '').toLowerCase() === currentUserId || String(item.email || '').toLowerCase() === currentUserEmail),
        );

        setManagerScopeProvinceName(me?.assignedProvinceName || '');
      }

      setStaff(enriched);
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    setRoleLoading(true);
    try {
      const data = await adminRoleService.getRoles();
      const mapped = data.map(mapRoleItem).filter((x) => Boolean(x.id) && Boolean(x.name));
      setRoles(mapped);
    } catch (error) {
      console.error('Error loading roles:', error);
      toast.error('Không thể tải danh sách role');
    } finally {
      setRoleLoading(false);
    }
  };

  const loadAssignmentData = async () => {
    setAssignmentLoading(true);
    try {
      const [provinces, homestays, districts] = await Promise.all([
        locationService.getProvinces(),
        homestayService.getAllAdminHomestays(),
        districtService.getAllDistricts(),
      ]);

      const provinceList = provinces
        .map((p) => ({ id: String(p.id), name: p.name }))
        .filter((p) => p.id && p.name);
      setProvinceOptions(provinceList);

      const districtToProvince = new Map(
        districts
          .filter((d) => d.id && d.provinceName)
          .map((d) => [String(d.id), String(d.provinceName)]),
      );

      const mappedHomestays: HomestayOption[] = (homestays as Homestay[])
        .map((h) => ({
          id: String(h.id || ''),
          name: String(h.name || 'Homestay'),
          provinceName: h.provinceName || districtToProvince.get(String(h.districtId || '')) || h.city,
        }))
        .filter((h) => Boolean(h.id));

      setHomestayOptions(mappedHomestays);
      setStaff((prev) => enrichStaffAssignments(prev, mappedHomestays));
    } catch (error) {
      console.error('Error loading assignment data:', error);
      toast.error('Không thể tải dữ liệu phân công tỉnh/homestay');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const homestaysByProvince = (() => {
    if (!selectedProvinceId) return [];
    const selectedProvince = provinceOptions.find((p) => p.id === selectedProvinceId);
    if (!selectedProvince) return [];
    const provinceName = normalizeText(selectedProvince.name);
    return homestayOptions.filter((h) => normalizeText(h.provinceName) === provinceName);
  })();

  const openAssignModal = (staffMember: Staff) => {
    if (isManagerMode && staffMember.role !== 'staff') {
      toast.error('Manager chỉ được phân công cho tài khoản nhân viên');
      return;
    }

    const inferredProvinceIdFromHomestay = (staffMember.assignedHomestays || [])
      .map((id) => homestayOptions.find((h) => h.id === id))
      .find((h) => h?.provinceName)
      ? provinceOptions.find(
          (p) =>
            normalizeText(p.name) ===
            normalizeText(
              (staffMember.assignedHomestays || [])
                .map((id) => homestayOptions.find((h) => h.id === id)?.provinceName)
                .find(Boolean),
            ),
        )?.id
      : '';

    const preselectedProvinceId =
      staffMember.assignedProvinceId ||
      provinceOptions.find((p) => normalizeText(p.name) === normalizeText(staffMember.assignedProvinceName))?.id ||
      inferredProvinceIdFromHomestay ||
      '';

    setAssigningStaff(staffMember);
    setSelectedProvinceId(preselectedProvinceId);
    setSelectedHomestayIds(staffMember.role === 'staff' ? staffMember.assignedHomestays || [] : []);
    setIsAssignModalOpen(true);
  };

  const handleToggleHomestay = (homestayId: string) => {
    setSelectedHomestayIds((prev) => {
      if (prev.includes(homestayId)) {
        return prev.filter((id) => id !== homestayId);
      }
      return [...prev, homestayId];
    });
  };

  const handleSaveAssignment = async () => {
    if (!assigningStaff) return;

    if (isManagerMode && assigningStaff.role !== 'staff') {
      toast.error('Manager không có quyền phân công tài khoản quản lý');
      return;
    }

    const isManagerRole = assigningStaff.role === 'manager' || assigningStaff.role === 'admin';
    const isStaffRole = assigningStaff.role === 'staff';

    if (!selectedProvinceId) {
      toast.error(isManagerRole ? 'Vui lòng chọn tỉnh phụ trách' : 'Vui lòng chọn tỉnh để lọc homestay');
      return;
    }

    const allowedIds = new Set(homestaysByProvince.map((h) => h.id));
    const homestayIds = selectedHomestayIds.filter((id) => allowedIds.has(id));
    const homestayNames = homestayIds
      .map((id) => homestayOptions.find((h) => h.id === id)?.name)
      .filter((name): name is string => Boolean(name));

    if (isStaffRole && homestayIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 homestay cho nhân viên');
      return;
    }

    setAssigningSubmitting(true);
    try {
      if (isManagerRole) {
        const provinceRes = await employeeService.assignProvince(assigningStaff.id, selectedProvinceId);
        if (!provinceRes?.success) {
          toast.error(provinceRes?.message || 'Không thể phân công tỉnh');
          return;
        }
      }

      if (isStaffRole) {
        const homestayRes = await employeeService.assignHomestays(assigningStaff.id, homestayIds);
        if (!homestayRes?.success) {
          toast.error(homestayRes?.message || 'Không thể phân công homestay');
          return;
        }
      }

      const selectedProvince = provinceOptions.find((p) => p.id === selectedProvinceId);
      setStaff((prev) =>
        prev.map((item) =>
          item.id === assigningStaff.id
            ? {
                ...item,
                assignedProvinceId: isManagerRole ? selectedProvinceId : item.assignedProvinceId,
                assignedProvinceName: isManagerRole
                  ? selectedProvince?.name || item.assignedProvinceName
                  : item.assignedProvinceName,
                assignedHomestays: isStaffRole ? homestayIds : item.assignedHomestays,
                assignedHomestayNames: isStaffRole ? homestayNames : item.assignedHomestayNames,
              }
            : item,
        ),
      );

      toast.success(isManagerRole ? 'Phân công tỉnh thành công' : 'Phân công homestay thành công');
      setIsAssignModalOpen(false);
      setAssigningStaff(null);
      void loadStaff();
    } catch (error) {
      console.error('Save assignment error:', error);
      toast.error('Không thể lưu phân công');
    } finally {
      setAssigningSubmitting(false);
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
    void loadStaff();
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setEditingStaff(null);
  };

  const openCreateRoleModal = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '' });
    setIsRoleModalOpen(true);
  };

  const openEditRoleModal = (role: Role) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description || '' });
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    const name = roleForm.name.trim();
    const description = roleForm.description.trim();

    if (!name) {
      toast.error('Tên role không được để trống');
      return;
    }

    setRoleSubmitting(true);
    try {
      if (editingRole) {
        const res = await adminRoleService.updateRole(editingRole.id, { name, description });
        if (res?.success === false || !res) {
          toast.error(res?.message || 'Không thể cập nhật role');
          return;
        }
        toast.success('Cập nhật role thành công');
      } else {
        const res = await adminRoleService.createRole({ name, description });
        if (res?.success === false || !res) {
          toast.error(res?.message || 'Không thể tạo role');
          return;
        }
        toast.success('Tạo role thành công');
      }

      setIsRoleModalOpen(false);
      setEditingRole(null);
      setRoleForm({ name: '', description: '' });
      await loadRoles();
    } catch (error) {
      console.error('Save role error:', error);
      toast.error('Không thể lưu role');
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    const res = await adminRoleService.deleteRole(role.id);
    if (res?.success === false || !res) {
      toast.error(res?.message || 'Không thể xóa role');
      return;
    }

    toast.success('Xóa role thành công');
    setDeletingRole(null);
    await loadRoles();
  };

  const filteredRoles = roles.filter((r) => {
    if (!roleSearchQuery.trim()) return true;
    const q = roleSearchQuery.toLowerCase();
    return r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q);
  });

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

  const navItems = isAdminMode
    ? adminNavItems
    : [
        { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, path: '/manager/dashboard' },
        { id: 'bookings', label: 'Đơn đặt phòng', icon: CalendarDays, path: '/manager/bookings' },
        { id: 'customers', label: 'Khách hàng', icon: Users, path: '/manager/customers' },
        { id: 'staff', label: 'Nhân viên', icon: UserCog, path: '/manager/staff' },
        { id: 'homestays', label: 'Xem Homestay', icon: Home, path: '/manager/homestays' },
        { id: 'revenue', label: 'Báo cáo', icon: TrendingUp, path: '/manager/reports' },
      ];

  const managerAccounts = filteredStaff.filter((s) => s.role === 'manager' || s.role === 'admin');
  const staffAccounts = filteredStaff.filter((s) => s.role === 'staff');
  const staffForStats = isManagerMode ? getManagerScopedStaff(staff) : staff;
  const displayStats = {
    total: staffForStats.length,
    active: staffForStats.filter((s) => s.status === 'active').length,
    onLeave: staffForStats.filter((s) => s.status === 'on_leave').length,
    inactive: staffForStats.filter((s) => s.status === 'inactive').length,
    managers: staffForStats.filter((s) => s.role === 'manager' || s.role === 'admin').length,
    staff: staffForStats.filter((s) => s.role === 'staff').length,
  };

  const renderStaffGrid = (items: Staff[]) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {items.map((staffMember) => (
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
                  {(staffMember.role === 'manager' || staffMember.role === 'admin') && (
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>Tỉnh phụ trách: {staffMember.assignedProvinceName || 'Chưa phân công'}</span>
                    </div>
                  )}
                  {staffMember.role === 'staff' && (
                    <>
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Home className="w-4 h-4 text-gray-400" />
                        <span>
                          Phụ trách {Math.max(staffMember.assignedHomestays.length, staffMember.assignedHomestayNames?.length || 0)} homestay
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-gray-600 text-sm">
                        <Home className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="line-clamp-2">
                          Homestay phụ trách:{' '}
                          {staffMember.assignedHomestayNames && staffMember.assignedHomestayNames.length > 0
                            ? staffMember.assignedHomestayNames.join(', ')
                            : 'Chưa phân công'}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => openAssignModal(staffMember)}
                    disabled={isManagerMode && staffMember.role !== 'staff'}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>{isManagerMode && staffMember.role !== 'staff' ? 'Không thể phân công' : 'Phân công'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingStaff(staffMember);
                      setIsEditModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Sửa</span>
                  </button>
                  <button
                    onClick={() => setDeletingStaff(staffMember)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
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
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-white shadow-lg w-64`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-900">{isAdminMode ? 'CHMS Admin' : 'CHMS Manager'}</h1>
              <p className="text-xs text-gray-500">{isAdminMode ? 'Management System' : 'Quản lý vận hành'}</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] pb-32">
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
                <p className="text-gray-600 text-sm">
                  {isAdminMode ? 'Quản lý thông tin nhân viên và phân quyền' : 'Quản lý nhân viên trực thuộc (Manager chỉ tạo được Staff)'}
                </p>
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
              <span>{isManagerMode ? 'Thêm nhân viên Staff' : 'Thêm nhân viên'}</span>
            </button>
          </div>
        </header>

        <div className="p-6">
          {isManagerMode && (
            <div className="mb-4 rounded-lg bg-cyan-50 border border-cyan-200 px-4 py-3 text-sm text-cyan-800">
              Phạm vi hiển thị: nhân viên thuộc tỉnh phụ trách{' '}
              <span className="font-semibold">{managerScopeProvinceName || 'chưa xác định'}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Tổng nhân viên</p>
                  <p className="text-3xl font-bold text-gray-900">{displayStats.total}</p>
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
                  <p className="text-3xl font-bold text-gray-900">{displayStats.active}</p>
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
                  <p className="text-3xl font-bold text-gray-900">{displayStats.onLeave}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">{isManagerMode ? 'Nhân viên Staff' : 'Quản lý'}</p>
                  <p className="text-3xl font-bold text-gray-900">{isManagerMode ? displayStats.staff : displayStats.managers}</p>
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
                  {!isManagerMode && <option value="admin">Quản trị viên</option>}
                  {!isManagerMode && <option value="manager">Quản lý</option>}
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
                Hiển thị <span className="font-semibold">{filteredStaff.length}</span> / {displayStats.total} nhân viên
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
            <div className="space-y-8">
              {isAdminMode && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Tài khoản quản lý ({managerAccounts.length})
                  </h3>
                </div>
                {managerAccounts.length > 0 ? (
                  renderStaffGrid(managerAccounts)
                ) : (
                  <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                    Không có tài khoản quản lý theo bộ lọc hiện tại.
                  </div>
                )}
              </section>
              )}

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isManagerMode ? `Nhân viên thuộc tỉnh phụ trách (${staffAccounts.length})` : `Tài khoản nhân viên (${staffAccounts.length})`}
                  </h3>
                </div>
                {staffAccounts.length > 0 ? (
                  renderStaffGrid(staffAccounts)
                ) : (
                  <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                    Không có tài khoản nhân viên theo bộ lọc hiện tại.
                  </div>
                )}
              </section>
            </div>
          )}

          {isAdminMode && (
          <div className="bg-white rounded-xl shadow-md p-6 mt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Quản lý Role</h3>
                <p className="text-sm text-gray-600">Admin có thể tạo, chỉnh sửa và xóa role tại đây</p>
              </div>
              <button
                onClick={openCreateRoleModal}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm role</span>
              </button>
            </div>

            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm role theo tên hoặc mô tả..."
                  value={roleSearchQuery}
                  onChange={(e) => setRoleSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {roleLoading ? (
              <div className="py-8 text-center text-gray-600">Đang tải danh sách role...</div>
            ) : filteredRoles.length === 0 ? (
              <div className="py-8 text-center text-gray-600">Không có role nào phù hợp</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Tên role</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Mô tả</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Trạng thái</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Ngày tạo</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoles.map((role) => (
                      <tr key={role.id} className="border-t border-gray-200">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{role.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{role.description || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          {role.isSystemRole ? (
                            <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">System</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Custom</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {role.createdAt ? new Date(role.createdAt).toLocaleDateString('vi-VN') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditRoleModal(role)}
                              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => setDeletingRole(role)}
                              disabled={role.isSystemRole}
                              className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
          allowedRoleNames={isManagerMode ? ['staff'] : ['manager', 'staff']}
          availableHomestays={homestayOptions}
          isManagerMode={isManagerMode}
          managerProvinceId={
            isManagerMode
              ? provinceOptions.find((p) => normalizeText(p.name) === normalizeText(managerScopeProvinceName))
                  ?.name || ''
              : ''
          }
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

      {isAssignModalOpen && assigningStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-900 text-xl mb-1">Phân công khu vực cho nhân viên</h3>
            <p className="text-sm text-gray-600 mb-5">
              Nhân viên: <span className="font-semibold">{assigningStaff.name}</span>
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {assigningStaff.role === 'staff' ? 'Chọn tỉnh để lọc homestay' : 'Tỉnh phụ trách'}
                </label>
                <select
                  value={selectedProvinceId}
                  onChange={(e) => {
                    const nextProvinceId = e.target.value;
                    setSelectedProvinceId(nextProvinceId);
                    const selectedProvince = provinceOptions.find((p) => p.id === nextProvinceId);
                    const provinceName = normalizeText(selectedProvince?.name);

                    setSelectedHomestayIds((prev) =>
                      prev.filter((id) => {
                        const found = homestayOptions.find((h) => h.id === id);
                        return found ? normalizeText(found.provinceName) === provinceName : false;
                      }),
                    );
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={assignmentLoading || assigningSubmitting}
                >
                  <option value="">Chọn tỉnh</option>
                  {provinceOptions.map((province) => (
                    <option key={province.id} value={province.id}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>

              {assigningStaff.role === 'staff' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Homestay phụ trách (chọn nhiều)</label>
                  <span className="text-xs text-gray-500">Đã chọn: {selectedHomestayIds.length}</span>
                </div>

                {!selectedProvinceId ? (
                  <div className="px-4 py-6 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 text-center">
                    Vui lòng chọn tỉnh trước khi chọn homestay.
                  </div>
                ) : homestaysByProvince.length === 0 ? (
                  <div className="px-4 py-6 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 text-center">
                    Không có homestay nào thuộc tỉnh đã chọn.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {homestaysByProvince.map((homestay) => {
                      const isSelected = selectedHomestayIds.includes(homestay.id);
                      return (
                        <button
                          type="button"
                          key={homestay.id}
                          onClick={() => handleToggleHomestay(homestay.id)}
                          className={`flex items-center justify-between text-left px-3 py-2 rounded-lg border transition-colors ${
                            isSelected
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <span className="text-sm font-medium">{homestay.name}</span>
                          {isSelected && <Check className="w-4 h-4" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setAssigningStaff(null);
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={assigningSubmitting}
              >
                Hủy
              </button>
              <button
                onClick={() => void handleSaveAssignment()}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
                disabled={assignmentLoading || assigningSubmitting}
              >
                {assigningSubmitting
                  ? 'Đang lưu...'
                  : assigningStaff.role === 'staff'
                    ? 'Lưu phân công homestay'
                    : 'Lưu phân công tỉnh'}
              </button>
            </div>
          </div>
        </div>
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

      {isAdminMode && isRoleModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-1">{editingRole ? 'Chỉnh sửa role' : 'Tạo role mới'}</h3>
            <p className="text-sm text-gray-600 mb-5">Nhập thông tin role để lưu vào hệ thống</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên role</label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ví dụ: Content Moderator"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea
                  rows={3}
                  value={roleForm.description}
                  onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả quyền và phạm vi sử dụng role"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsRoleModalOpen(false);
                  setEditingRole(null);
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveRole}
                disabled={roleSubmitting}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {roleSubmitting ? 'Đang lưu...' : 'Lưu role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdminMode && deletingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Xác nhận xóa role</h3>
                <p className="text-gray-600 text-sm">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Bạn có chắc chắn muốn xóa role <strong>{deletingRole.name}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeletingRole(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => void handleDeleteRole(deletingRole)}
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
