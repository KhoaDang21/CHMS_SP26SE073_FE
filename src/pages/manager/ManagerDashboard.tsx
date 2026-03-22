import { useNavigate } from 'react-router-dom';
import { Crown, Home, TrendingUp, Users, Calendar, DollarSign, Settings } from 'lucide-react';
import { authService } from '../../services/authService';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData') || '{}');

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-amber-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
                <p className="text-sm text-gray-600">Bảng điều khiển quản lý</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name || 'Manager'}</p>
                <p className="text-xs text-amber-600 font-semibold">Quản lý</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Chào mừng, {user.name}!</h2>
          <p className="text-amber-100 text-lg">Bạn đang truy cập với vai trò Quản lý</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-md border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <Home className="w-10 h-10 text-blue-600" />
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Homestay</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">12</h3>
            <p className="text-sm text-gray-600">Đang quản lý</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-10 h-10 text-green-600" />
              <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">Doanh thu</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">$12.5K</h3>
            <p className="text-sm text-gray-600">Tháng này</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-10 h-10 text-purple-600" />
              <span className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">Booking</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">89</h3>
            <p className="text-sm text-gray-600">Đặt phòng tháng này</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-orange-100">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-10 h-10 text-orange-600" />
              <span className="text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full">Tăng trưởng</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">+23%</h3>
            <p className="text-sm text-gray-600">So với tháng trước</p>
          </div>
        </div>

        {/* My Homestays */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Home className="w-6 h-6 text-amber-600" />
            Homestay của tôi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                  <Home className="w-10 h-10 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Seaside Villa</h4>
                  <p className="text-sm text-gray-600 mb-2">Vũng Tàu, Việt Nam</p>
                  <div className="flex gap-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Hoạt động</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">5 booking</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                  <Home className="w-10 h-10 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Mountain View</h4>
                  <p className="text-sm text-gray-600 mb-2">Đà Lạt, Việt Nam</p>
                  <div className="flex gap-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Hoạt động</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">8 booking</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-amber-500 hover:text-amber-600 transition-colors font-medium">
            + Thêm homestay mới
          </button>
        </div>

        {/* Management Options */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-600" />
            Quản lý
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 bg-amber-50 hover:bg-amber-100 rounded-lg text-left transition-colors border border-amber-200">
              <Users className="w-8 h-8 text-amber-600 mb-2" />
              <h4 className="font-semibold text-gray-900 mb-1">Quản lý nhân viên</h4>
              <p className="text-sm text-gray-600">Phân công và giám sát</p>
            </button>
            <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors border border-blue-200">
              <Calendar className="w-8 h-8 text-blue-600 mb-2" />
              <h4 className="font-semibold text-gray-900 mb-1">Lịch đặt phòng</h4>
              <p className="text-sm text-gray-600">Xem và quản lý booking</p>
            </button>
            <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors border border-green-200">
              <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
              <h4 className="font-semibold text-gray-900 mb-1">Báo cáo</h4>
              <p className="text-sm text-gray-600">Thống kê và phân tích</p>
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Crown className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-amber-900 mb-2">Vai trò Quản lý</h4>
              <p className="text-sm text-amber-800">
                Bạn có quyền quản lý homestay, nhân viên và khách hàng. Bạn có thể xem báo cáo và thống kê kinh doanh.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
