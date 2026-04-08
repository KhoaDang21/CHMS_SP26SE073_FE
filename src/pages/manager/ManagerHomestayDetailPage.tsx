import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Home,
  ArrowLeft,
  Edit,
  MapPin,
  Users,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Building2,
  Sparkles,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  UserCog,
  Shield,
  FileText,
  UserCheck,
  MessageSquare,
} from 'lucide-react';

import { homestayService } from '../../services/homestayService';
import type { Homestay, UpdateHomestayDTO } from '../../types/homestay.types';
import { toast } from 'sonner';
import { RoleBadge } from '../../components/common/RoleBadge';
import { authService } from '../../services/authService';
import EditHomestayModal from '../../components/admin/EditHomestayModal';

export default function ManagerHomestayDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [homestay, setHomestay] = useState<Homestay | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingHomestay, setUpdatingHomestay] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const user = authService.getCurrentUser();

  useEffect(() => {
    if (id) {
      loadHomestayDetail(id);
    } else {
      toast.error('ID homestay không hợp lệ');
      navigate('/manager/homestays');
    }
  }, [id, navigate]);

  const loadHomestayDetail = async (homestayId: string) => {
    setLoading(true);
    try {
      const data = await homestayService.getAdminHomestayById(homestayId);
      if (data) {
        setHomestay(data);
      } else {
        toast.error('Không tìm thấy homestay');
        navigate('/manager/homestays');
      }
    } catch (error) {
      console.error('Error loading homestay:', error);
      toast.error('Không thể tải thông tin homestay');
      navigate('/manager/homestays');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (newStatus: Homestay['status']) => {
    if (!homestay || !id || homestay.status === newStatus) return;

    setUpdatingStatus(true);
    try {
      const result = await homestayService.updateAdminHomestayStatus(homestay.id, newStatus);
      if (result?.success === false) {
        toast.error(result.message || 'Không thể cập nhật trạng thái homestay');
        return;
      }

      const statusText: Record<Homestay['status'], string> = {
        ACTIVE: 'Đang hoạt động',
        OCCUPIED: 'Đang có người ở',
        CLEANING: 'Đang dọn dẹp',
        INACTIVE: 'Tạm ngưng',
        MAINTENANCE: 'Bảo trì',
      };

      toast.success(`Đã cập nhật trạng thái: ${statusText[newStatus]}`);
      await loadHomestayDetail(id);
    } catch (error) {
      console.error('Error updating homestay status:', error);
      toast.error('Không thể cập nhật trạng thái homestay');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdateHomestay = async (data: UpdateHomestayDTO, imageFiles: File[] = []) => {
    if (!homestay || !id) return;

    setUpdatingHomestay(true);
    try {
      const result = await homestayService.updateAdminHomestay(homestay.id, data);
      if (result?.success === false) {
        toast.error(result.message || 'Khong the cap nhat homestay');
        return;
      }

      if (imageFiles.length > 0) {
        const uploadSummary = await homestayService.uploadAdminHomestayPhotos(homestay.id, imageFiles);
        if (uploadSummary.failed > 0) {
          toast.warning(`Cap nhat thanh cong, nhung ${uploadSummary.failed}/${uploadSummary.total} anh upload that bai`);
        }
      }

      toast.success('Cap nhat homestay thanh cong');
      setShowEditModal(false);
      await loadHomestayDetail(id);
    } catch (error: any) {
      toast.error(error?.message || 'Da xay ra loi khi cap nhat homestay');
    } finally {
      setUpdatingHomestay(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  const nextImage = () => {
    const images = homestay?.imageUrls || [];
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    const images = homestay?.imageUrls || [];
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, path: '/manager/dashboard' },
    { id: 'bookings', label: 'Đơn đặt phòng', icon: Calendar, path: '/manager/bookings' },
    { id: 'customers', label: 'Khách hàng', icon: Users, path: '/manager/customers' },
    { id: 'staff', label: 'Nhân viên', icon: UserCog, path: '/manager/staff' },
    { id: 'homestays', label: 'Xem Homestay', icon: Home, path: '/manager/homestays' },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare, path: '/manager/reviews' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông tin homestay...</p>
        </div>
      </div>
    );
  }

  if (!homestay) {
    return null;
  }

  const images = homestay.imageUrls || [];
  const amenities = homestay.amenityNames || [];

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
              <button
                onClick={() => navigate('/manager/homestays')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Quay lại danh sách</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white"
              >
                <span className="text-sm text-gray-600">Trạng thái:</span>
                <select
                  value={homestay.status}
                  disabled={updatingStatus}
                  onChange={(e) => handleChangeStatus(e.target.value as Homestay['status'])}
                  className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
                >
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="OCCUPIED">Đang có người ở</option>
                  <option value="CLEANING">Đang dọn dẹp</option>
                  <option value="MAINTENANCE">Bảo trì</option>
                  <option value="INACTIVE">Tạm ngưng</option>
                </select>
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-5 h-5" />
                <span>Chỉnh sửa</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 max-w-7xl mx-auto">
          {/* Title and Status */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{homestay.name}</h1>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-5 h-5" />
                    <span>{homestay.address}</span>
                  </div>
                  {homestay.featured && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                      ⭐ Nổi bật
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${
                homestay.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-700'
                  : homestay.status === 'OCCUPIED'
                  ? 'bg-blue-100 text-blue-700'
                  : homestay.status === 'CLEANING'
                  ? 'bg-cyan-100 text-cyan-700'
                  : homestay.status === 'INACTIVE'
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-orange-100 text-orange-700'
              }`}
            >
              {homestay.status === 'ACTIVE'
                ? '✓ Đang hoạt động'
                : homestay.status === 'OCCUPIED'
                ? '🏠 Đang có người ở'
                : homestay.status === 'CLEANING'
                ? '🧹 Đang dọn dẹp'
                : homestay.status === 'INACTIVE'
                ? '⊗ Tạm ngưng'
                : '⚠ Bảo trì'}
            </div>
          </div>

          {/* Image Gallery */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
            <div className="relative h-96 md:h-[500px] bg-gray-200">
              {images.length > 0 ? (
                <>
                  <img
                    src={images[currentImageIndex]}
                    alt={`${homestay.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 p-2 rounded-full shadow-lg transition-all"
                      >
                        <ChevronLeft className="w-6 h-6 text-gray-900" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 p-2 rounded-full shadow-lg transition-all"
                      >
                        <ChevronRight className="w-6 h-6 text-gray-900" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 px-4 py-2 rounded-full text-white text-sm">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Home className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Chưa có hình ảnh</p>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="p-4 flex gap-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentImageIndex
                        ? 'border-blue-600 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  Mô tả
                </h2>
                <p className="text-gray-700 leading-relaxed">{homestay.description}</p>
              </div>

              {/* Room Details */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Home className="w-6 h-6 text-blue-600" />
                  Thông tin cơ bản
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{homestay.maxGuests}</p>
                    <p className="text-sm text-gray-600">Khách tối đa</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <DollarSign className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-lg font-bold text-gray-900">
                      {homestay.pricePerNight.toLocaleString('vi-VN')} ₫
                    </p>
                    <p className="text-sm text-gray-600">Mỗi đêm</p>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                  Tiện ích
                </h2>
                <div className="flex flex-wrap gap-2">
                  {amenities.length > 0 ? (
                    amenities.map((amenity: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 rounded-lg border border-blue-200 text-sm font-medium"
                      >
                        {amenity}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500">Chưa có tiện ích nào</p>
                  )}
                </div>
              </div>

              {/* Policies */}
              {(homestay.cancellationPolicy || homestay.houseRules) && (
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-600" />
                    Chính sách & Quy định
                  </h2>
                  {homestay.cancellationPolicy && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Chính sách hủy</h3>
                      <p className="text-gray-700 leading-relaxed">{homestay.cancellationPolicy}</p>
                    </div>
                  )}
                  {homestay.houseRules && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Quy định nhà</h3>
                      <p className="text-gray-700 leading-relaxed">{homestay.houseRules}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Sidebar Info */}
            <div className="space-y-6">
              {/* Location */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-blue-600" />
                  Địa điểm
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Địa chỉ</p>
                    <p className="text-gray-900 font-medium">{homestay.address}</p>
                  </div>
                  {homestay.districtName && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Quận/Huyện</p>
                      <p className="text-gray-900 font-medium">{homestay.districtName}</p>
                    </div>
                  )}
                  {homestay.provinceName && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Tỉnh/Thành phố</p>
                      <p className="text-gray-900 font-medium">{homestay.provinceName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Owner Info */}
              {homestay.ownerName && (
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <UserCheck className="w-6 h-6 text-blue-600" />
                    Chủ sở hữu
                  </h2>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Tên chủ</p>
                      <p className="text-gray-900 font-medium">{homestay.ownerName}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  Thông tin hệ thống
                </h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">ID</p>
                    <p className="text-gray-900 font-mono text-xs break-all">{homestay.id}</p>
                  </div>
                  {homestay.createdAt && (
                    <div>
                      <p className="text-gray-500 mb-1">Ngày tạo</p>
                      <p className="text-gray-900">
                        {new Date(homestay.createdAt).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                  {homestay.updatedAt && (
                    <div>
                      <p className="text-gray-500 mb-1">Cập nhật lần cuối</p>
                      <p className="text-gray-900">
                        {new Date(homestay.updatedAt).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <EditHomestayModal
        isOpen={showEditModal}
        homestay={homestay}
        loading={updatingHomestay}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateHomestay}
      />
    </div>
  );
}
