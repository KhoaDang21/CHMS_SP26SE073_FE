import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Star,
  MapPin,
  Users,
  DollarSign,
  Menu,
  X,
  Building2,
  LogOut,
} from 'lucide-react';

import { homestayService } from '../../services/homestayService';
import { managerHomestayService } from '../../services/managerHomestayService';
import type { Homestay, CreateHomestayDTO, UpdateHomestayDTO } from '../../types/homestay.types';
import { toast } from 'sonner';
import { RoleBadge } from '../../components/common/RoleBadge';
import CreateHomestayModal from '../../components/admin/CreateHomestayModal';
import EditHomestayModal from '../../components/admin/EditHomestayModal';
import { authService } from '../../services/authService';
import { managerNavItems } from '../../config/managerNavItems';

export default function ManagerHomestayManagement() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [filteredHomestays, setFilteredHomestays] = useState<Homestay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'occupied' | 'cleaning' | 'maintenance' | 'inactive'>('all');
  const [selectedHomestay, setSelectedHomestay] = useState<Homestay | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingHomestay, setCreatingHomestay] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHomestay, setEditingHomestay] = useState<Homestay | null>(null);
  const [updatingHomestay, setUpdatingHomestay] = useState(false);

  const user = authService.getCurrentUser();

  useEffect(() => {
    loadHomestays();
  }, []);

  useEffect(() => {
    filterHomestays();
  }, [homestays, searchQuery, filterStatus]);

  const loadHomestays = async () => {
    setLoading(true);
    try {
      const data = await managerHomestayService.list();
      setHomestays(data);
    } catch (error) {
      console.error('Error loading homestays:', error);
      toast.error('Không thể tải danh sách homestay');
    } finally {
      setLoading(false);
    }
  };

  const filterHomestays = () => {
    let filtered = [...homestays];

    // Filter by status
    if (filterStatus !== 'all') {
      const statusMap: Record<string, string> = {
        'active': 'ACTIVE',
        'occupied': 'OCCUPIED',
        'cleaning': 'CLEANING',
        'inactive': 'INACTIVE',
        'maintenance': 'MAINTENANCE'
      };
      filtered = filtered.filter(h => h.status === statusMap[filterStatus]);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h =>
        h.name.toLowerCase().includes(query) ||
        h.address.toLowerCase().includes(query) ||
        h.districtName?.toLowerCase().includes(query) ||
        h.provinceName?.toLowerCase().includes(query)
      );
    }

    setFilteredHomestays(filtered);
  };


  const handleDeleteHomestay = async () => {
    if (!selectedHomestay) return;

    const result = await homestayService.deleteAdminHomestay(selectedHomestay.id);
    
    if (result.success) {
      toast.success('Đã xóa homestay thành công');
      setShowDeleteModal(false);
      setSelectedHomestay(null);
      loadHomestays();
    } else {
      toast.error(result.message || 'Không thể xóa homestay');
    }
  };

  const handleCreateHomestay = async (data: CreateHomestayDTO, imageFiles: File[] = []) => {
    setCreatingHomestay(true);
    try {
      const result = await homestayService.createAdminHomestay(data);
      
      if (result.success) {
        let createdId = result?.data?.id || null;

        // Some BE responses return success=true but data=null, so we recover id by querying latest matches.
        if (!createdId && imageFiles.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          const allHomestays = await homestayService.getAllAdminHomestays();

          const matched = allHomestays
            .filter((h) =>
              h.name === data.name &&
              h.address === data.address &&
              Number(h.pricePerNight) === Number(data.pricePerNight),
            )
            .sort((a, b) => {
              const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
              const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
              return bTime - aTime;
            });

          createdId = matched[0]?.id || null;
        }

        if (createdId && imageFiles.length > 0) {
          const uploadSummary = await homestayService.uploadAdminHomestayPhotos(createdId, imageFiles);

          if (uploadSummary.failed > 0) {
            toast.warning(`Tạo homestay thành công, nhưng ${uploadSummary.failed}/${uploadSummary.total} ảnh upload thất bại`);
          }
        } else if (imageFiles.length > 0) {
          toast.warning('Đã tạo homestay nhưng không lấy được ID để upload ảnh');
        }

        toast.success('Đã tạo homestay mới thành công!');
        setShowCreateModal(false);
        loadHomestays();
      } else {
        // Show detailed error message from backend
        toast.error(result.message || 'Không thể tạo homestay', {
          description: result.message?.includes('SqlServerRetryingExecutionStrategy') 
            ? 'Lỗi cấu hình backend. Liên hệ backend developer để fix SqlServerRetryingExecutionStrategy.'
            : undefined,
          duration: 5000
        });
      }
    } catch (error: any) {
      console.error('Error creating homestay:', error);
      toast.error('Đã xảy ra lỗi khi tạo homestay', {
        description: error.message,
        duration: 5000
      });
    } finally {
      setCreatingHomestay(false);
    }
  };

  const handleOpenEditModal = async (homestay: Homestay) => {
    // Open modal immediately so user can edit even if detail API is slow/fails.
    setEditingHomestay(homestay);
    setShowEditModal(true);

    setUpdatingHomestay(true);
    try {
      const detail = await homestayService.getAdminHomestayById(homestay.id);
      if (!detail) {
        toast.warning('Không tải được chi tiết mới nhất, đang dùng dữ liệu hiện tại');
        return;
      }

      setEditingHomestay(detail);
    } catch (error) {
      console.error('Error loading homestay detail for editing:', error);
      toast.warning('Không tải được chi tiết mới nhất, đang dùng dữ liệu hiện tại');
    } finally {
      setUpdatingHomestay(false);
    }
  };

  const handleUpdateHomestay = async (data: UpdateHomestayDTO, imageFiles: File[] = []) => {
    if (!editingHomestay) return;

    setUpdatingHomestay(true);
    try {
      const result = await homestayService.updateAdminHomestay(editingHomestay.id, data);
      if (result?.success === false) {
        toast.error(result.message || 'Không thể cập nhật homestay');
        return;
      }

      if (imageFiles.length > 0) {
        const uploadSummary = await homestayService.uploadAdminHomestayPhotos(editingHomestay.id, imageFiles);
        if (uploadSummary.failed > 0) {
          toast.warning(`Cập nhật thành công, nhưng ${uploadSummary.failed}/${uploadSummary.total} ảnh upload thất bại`);
        }
      }

      toast.success('Cập nhật homestay thành công');
      setShowEditModal(false);
      setEditingHomestay(null);
      loadHomestays();
    } catch (error: any) {
      console.error('Error updating homestay:', error);
      toast.error(error?.message || 'Đã xảy ra lỗi khi cập nhật homestay');
    } finally {
      setUpdatingHomestay(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  const navItems = managerNavItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-white shadow-lg w-64`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-900">CHMS Manager</h1>
              <p className="text-xs text-gray-500">Quản lý vận hành</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] pb-32">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'homestays';
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
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
              <div className="mt-1">
                {user?.role && <RoleBadge role={user.role} size="sm" />}
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

      {/* Main Content */}
      <div className={`transition-all ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Quản lý Homestay</h2>
                <p className="text-sm text-gray-500">Xem và quản lý homestay vận hành</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>Thêm Homestay</span>
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="p-6">
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, địa điểm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                {(['all', 'active', 'occupied', 'cleaning', 'maintenance', 'inactive'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      filterStatus === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {
                      status === 'all'
                        ? 'Tất cả'
                        : status === 'active'
                        ? 'Đang hoạt động'
                        : status === 'occupied'
                        ? 'Đang có người ở'
                        : status === 'cleaning'
                        ? 'Đang dọn dẹp'
                        : status === 'maintenance'
                        ? 'Bảo trì'
                        : 'Tạm ngưng'
                    }
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Homestay Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải dữ liệu...</p>
            </div>
          ) : filteredHomestays.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-md">
              <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Không tìm thấy homestay nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredHomestays.map((homestay) => (
                <div
                  key={homestay.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Image */}
                  <div className="relative h-48">
                    <img
                      src={homestay.imageUrls?.[0] || homestay.images?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format'}
                      alt={homestay.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format';
                      }}
                    />
                    <div className="absolute top-3 right-3 bg-white/85 backdrop-blur-sm rounded-lg border border-white/70 px-2 py-1 text-xs font-medium text-gray-700">
                      {homestay.status === 'ACTIVE'
                        ? 'Đang hoạt động'
                        : homestay.status === 'OCCUPIED'
                        ? 'Đang có người ở'
                        : homestay.status === 'CLEANING'
                        ? 'Đang dọn dẹp'
                        : homestay.status === 'INACTIVE'
                        ? 'Tạm ngưng'
                        : homestay.status === 'MAINTENANCE'
                        ? 'Bảo trì'
                        : 'Không xác định'}
                    </div>
                    {homestay.featured && (
                      <div className="absolute top-3 left-3 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-medium">
                        Nổi bật
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-2">{homestay.name}</h3>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{homestay.districtName}, {homestay.provinceName}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{homestay.rating || 0}</span>
                      <span>({homestay.reviewCount || 0} đánh giá)</span>
                    </div>

                    <div className="flex items-center justify-between text-sm mb-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{homestay.maxGuests} khách</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-900 font-semibold">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <span>{homestay.pricePerNight.toLocaleString('vi-VN')} ₫/đêm</span>
                      </div>
                    </div>

                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${
                      homestay.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : homestay.status === 'OCCUPIED'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : homestay.status === 'CLEANING'
                        ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                        : homestay.status === 'INACTIVE'
                        ? 'bg-gray-100 text-gray-700 border border-gray-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {homestay.status === 'ACTIVE'
                        ? 'Đang hoạt động'
                        : homestay.status === 'OCCUPIED'
                        ? 'Đang có người ở'
                        : homestay.status === 'CLEANING'
                        ? 'Đang dọn dẹp'
                        : homestay.status === 'INACTIVE'
                        ? 'Tạm ngưng'
                        : 'Bảo trì'}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/manager/homestays/${homestay.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Xem</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(homestay)}
                        disabled={updatingHomestay}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 disabled:opacity-60"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Sửa</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedHomestay(homestay);
                          setShowDeleteModal(true);
                        }}
                        className="px-3 py-2 bg-gray-50 text-red-600 rounded-lg hover:bg-red-50 transition-colors border border-gray-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedHomestay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-xl mb-4">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa homestay <strong>{selectedHomestay.name}</strong>? 
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedHomestay(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteHomestay}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Homestay Modal */}
      <CreateHomestayModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateHomestay}
        loading={creatingHomestay}
      />

      {/* Edit Homestay Modal */}
      <EditHomestayModal
        isOpen={showEditModal}
        homestay={editingHomestay}
        loading={updatingHomestay}
        onClose={() => {
          setShowEditModal(false);
          setEditingHomestay(null);
        }}
        onSubmit={handleUpdateHomestay}
      />

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
