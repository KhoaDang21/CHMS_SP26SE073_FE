import { useEffect, useState } from 'react';
import {
  Search,
  Package,
  CheckCircle,
  Clock,
  User,
  Calendar,
  AlertCircle,
  Home,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { RoleBadge } from '../../components/common/RoleBadge';
import type { EquipmentBorrow } from '../../types/equipment.types';
import { equipmentLendingService } from '../../services/equipmentLendingService';
import { employeeService } from '../../services/employeeService';
import { homestayService } from '../../services/homestayService';
import { staffNavItemsGrouped } from '../../config/staffNavItems';

const MOCK_HOMESTAYS = [
  { id: 'hs-1', name: 'Sunrise Beach Homestay' },
  { id: 'hs-2', name: 'Blue Coral Retreat' },
  { id: 'hs-3', name: 'Ocean Breeze Villa' },
];
 

export default function StaffEquipmentPage() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [homestays, setHomestays] = useState(MOCK_HOMESTAYS);
  const [homestayId, setHomestayId] = useState<string>(MOCK_HOMESTAYS[0]?.id ?? '');
  const [assignedHomestayIds, setAssignedHomestayIds] = useState<string[] | null>(null);

  const [pendingRequests, setPendingRequests] = useState<Array<{ raw: any; ui: EquipmentBorrow }>>([]);
  const [activeBorrows, setActiveBorrows] = useState<Array<{ raw: any; ui: EquipmentBorrow }>>([]);
  const [loading, setLoading] = useState(false);
  const [filterTab, setFilterTab] = useState<'pending' | 'active'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [returningItem, setReturningItem] = useState<EquipmentBorrow | null>(null);
  const [returnCondition, setReturnCondition] = useState<'good' | 'fair' | 'maintenance'>(
    'good'
  );
  const [returnNote, setReturnNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);



  const handleApproveBorrow = async (requestId: string) => {
    setIsSubmitting(true);
    try {
      await equipmentLendingService.staffApproveBorrowRequest(requestId);
      toast.success('Yêu cầu đã được chấp nhận');
      await loadRequests();
    } catch (err) {
      console.error(err);
      toast.error('Chấp nhận thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHandOverBorrow = async (requestId: string) => {
    setIsSubmitting(true);
    try {
      const staffId = user?.id;
      await equipmentLendingService.staffHandOverBorrowRequest(requestId, { staffId });
      toast.success('Đã giao đồ');
      await loadRequests();
    } catch (err) {
      console.error(err);
      toast.error('Giao đồ thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectBorrow = async (requestId: string) => {
    const reason = window.prompt('Lý do từ chối (tùy chọn):', '');
    if (reason === null) return; // user cancelled
    setIsSubmitting(true);
    try {
      const staffId = user?.id;
      await equipmentLendingService.staffRejectBorrowRequest(requestId, { rejectReason: reason || undefined, staffId });
      toast.success('Yêu cầu đã bị từ chối');
      await loadRequests();
    } catch (err) {
      console.error(err);
      toast.error('Từ chối thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordReturn = async () => {
    if (!returningItem) return;
    setIsSubmitting(true);
    try {
      const staffId = user?.id;
      await equipmentLendingService.staffRecordReturnBorrowRequest(returningItem.id, {
        condition: returnCondition,
        note: returnNote || undefined,
        staffId,
      });
      toast.success('Đã ghi nhận trả hàng');
      setReturningItem(null);
      setReturnCondition('good');
      setReturnNote('');
      await loadRequests();
    } catch (err) {
      console.error(err);
      toast.error('Ghi nhận trả thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Map a borrow request response to the UI-friendly EquipmentBorrow shape
  const mapRequestToBorrowLocal = (item: any): EquipmentBorrow => ({
    id: item?.id ?? '',
    bookingId: item?.bookingId ?? '',
    equipmentId: item?.equipmentId ?? '',
    equipmentName: item?.equipmentName ?? (item?.equipment?.name ?? ''),
    quantity: Number(item?.quantity ?? 1),
    borrowDate: item?.requestedAt ?? item?.borrowDate ?? '',
    returnDate: item?.returnedAt ?? item?.returnDate ?? undefined,
    status: ((): any => {
      const s = String(item?.status || '').toLowerCase();
      if (s === 'returned') return 'returned';
      if (s === 'rejected' || s === 'cancelled') return 'cancelled';
      if (s === 'pending' || s === 'requested') return 'pending';
      return 'borrowed';
    })(),
    borrowedBy: item?.customerName ?? item?.customerId ?? '',
    returnedBy: item?.returnedByStaffId ?? undefined,
    note: item?.note ?? undefined,
    condition: item?.condition ?? undefined,
  });

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (Array.isArray(assignedHomestayIds) && assignedHomestayIds.length > 0) {
        params.homestayIds = assignedHomestayIds;
      } else if (homestayId) {
        params.homestayId = homestayId;
      }

      const list = await equipmentLendingService.staffGetBorrowRequests(params);
      const combined = Array.isArray(list)
        ? list.map((item: any) => ({ raw: item, ui: mapRequestToBorrowLocal(item) }))
        : [];
      setPendingRequests(combined.filter((c) => c.ui.status === 'pending'));
      setActiveBorrows(combined.filter((c) => c.ui.status !== 'pending' && c.ui.status !== 'cancelled'));
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải dữ liệu mượn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      // If staff, try to resolve assigned homestays from employee profile
      try {
        if (user?.role === 'staff' && user.id) {
          const emp = await employeeService.getEmployeeById(user.id);
          const ids: string[] = (emp?.assignedHomestays ?? emp?.assignedHomestayIds ?? []) as string[];
          if (Array.isArray(ids) && ids.length > 0) {
            setAssignedHomestayIds(ids.map(String));
            // load homestay names/details
            const homes = await Promise.all(ids.map((id) => homestayService.getAdminHomestayById(String(id))));
            const valid = homes.filter(Boolean) as any[];
            if (valid.length > 0) {
              setHomestays(valid.map((h) => ({ id: h.id, name: h.name })));
              setHomestayId(valid[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Error loading staff assignments', err);
      }

      await loadRequests();
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homestayId]);

  const filteredRequests = (filterTab === 'pending' ? pendingRequests : activeBorrows).filter((c) => {
    const req = c.ui;
    const matchesSearch =
      req.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.borrowedBy?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const pendingCount = pendingRequests.length;
  const activeCount = activeBorrows.length;
  const selectedHomestay = homestays.find((h) => String(h.id) === String(homestayId));

  const navigationSections = staffNavItemsGrouped.map((section) => ({
    section: section.section,
    items: section.items.map((item) => ({
      ...item,
      active: item.path === '/staff/equipment',
    })),
  }));

  const handleLogout = () => {
    authService.logout();
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

          <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
            {navigationSections.map((section) => (
              <div key={section.section} className="space-y-1">
                <h3 className="px-4 text-xs font-bold text-cyan-200 uppercase tracking-wider">
                  {section.section}
                </h3>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      type="button"
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        item.active
                          ? 'bg-white/20 text-white font-medium'
                          : 'text-cyan-100 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="p-6 border-t border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {user?.name?.charAt(0)?.toUpperCase() ?? 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.name ?? 'Staff'}</p>
                <RoleBadge role={user?.role || 'staff'} size="sm" />
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
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                type="button"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Quản lý mượn/trả đồ dùng</h2>
                <p className="text-sm text-gray-500">
                  {selectedHomestay ? `Homestay: ${selectedHomestay.name}` : 'Chọn homestay để quản lý'}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6 max-w-7xl mx-auto">
        {/* Homestay Selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Chọn Homestay:</label>
            <select
              value={homestayId}
              onChange={(e) => setHomestayId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
            >
              {homestays.map((h) => (
                <option key={String(h.id)} value={String(h.id)}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl shadow-sm border border-orange-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Yêu cầu chờ xác nhận</p>
                <p className="text-3xl font-bold text-orange-900 mt-2">{pendingCount}</p>
              </div>
              <Clock className="w-12 h-12 text-orange-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Đang được mượn</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{activeCount}</p>
              </div>
              <Package className="w-12 h-12 text-blue-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Tabs & Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterTab('pending')}
                className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                  filterTab === 'pending'
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Yêu cầu ({pendingCount})
              </button>
              <button
                onClick={() => setFilterTab('active')}
                className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                  filterTab === 'active'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Đang mượn ({activeCount})
              </button>
            </div>

            <div className="relative flex-1 md:flex-none md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            <p className="mt-3 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {filterTab === 'pending' ? 'Không có yêu cầu nào' : 'Không có mượn nào'}
            </h3>
            <p className="text-slate-600">
              {filterTab === 'pending'
                ? 'Tất cả yêu cầu đã được xác nhận'
                : 'Không có đồ dùng đang được mượn'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.raw?.id ?? request.ui.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Left - Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-white" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-slate-900 text-lg">
                            {request.ui.equipmentName}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                              filterTab === 'pending'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {filterTab === 'pending' ? 'CHỜ XÁC NHẬN' : 'ĐANG MƯỢN'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <User className="w-4 h-4" />
                            <span>{request.ui.borrowedBy || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Package className="w-4 h-4" />
                            <span>Số lượng: {request.ui.quantity}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-4 h-4" />
                            <span>Yêu cầu: {request.ui.borrowDate}</span>
                          </div>
                          {request.ui.returnDate && (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span>Trả: {request.ui.returnDate}</span>
                            </div>
                          )}
                          {request.ui.note && (
                            <div className="col-span-2 flex items-start gap-2 text-slate-600">
                              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>{request.ui.note}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right - Actions */}
                  <div className="flex gap-2">
                    {filterTab === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproveBorrow(request.raw?.id ?? request.ui.id)}
                          disabled={isSubmitting || String(request.raw?.status ?? request.ui.status).toLowerCase() !== 'pending'}
                          className="px-4 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-teal-500/30"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Xác nhận
                        </button>

                        <button
                          onClick={() => handleRejectBorrow(request.raw?.id ?? request.ui.id)}
                          disabled={isSubmitting}
                          className="px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-red-500/20"
                        >
                          <X className="w-5 h-5" />
                          Từ chối
                        </button>
                      </>
                    )}

                    {/* If approved but not yet handed over -> show hand-over */}
                    {String(request.raw?.approvedAt ?? '').length > 0 && !request.raw?.handedOverAt && (
                      <button
                        onClick={() => handleHandOverBorrow(request.raw?.id ?? request.ui.id)}
                        disabled={isSubmitting}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-amber-500/30"
                      >
                        <Package className="w-5 h-5" />
                        Giao
                      </button>
                    )}

                    {filterTab === 'active' && (
                      <button
                        onClick={() => {
                          setReturningItem(request.ui);
                          setReturnCondition('good');
                          setReturnNote('');
                        }}
                        className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-green-500/30"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Ghi nhận trả
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </main>
      </div>

      {/* Return Modal */}
      {returningItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ghi nhận trả hàng</h2>
            <p className="text-slate-600 mb-6">
              {returningItem.equipmentName} - Số lượng: {returningItem.quantity}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tình trạng *
                </label>
                <select
                  value={returnCondition}
                  onChange={(e) =>
                    setReturnCondition(e.target.value as 'good' | 'fair' | 'maintenance')
                  }
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="good">Tốt</option>
                  <option value="fair">Bình thường</option>
                  <option value="maintenance">Bảo trì</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ghi chú
                </label>
                <textarea
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Vết hư hại, bụi bẩn, v.v..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setReturningItem(null)}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleRecordReturn}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận trả'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
