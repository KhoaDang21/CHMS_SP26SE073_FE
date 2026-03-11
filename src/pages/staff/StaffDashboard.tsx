import { useNavigate } from 'react-router-dom';
import { Briefcase, Calendar, Home, Users, ClipboardList, BarChart3 } from 'lucide-react';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData') || '{}');

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
                <p className="text-sm text-gray-600">Bảng điều khiển nhân viên</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name || 'Staff'}</p>
                <p className="text-xs text-green-600 font-semibold">Nhân viên</p>
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
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Xin chào, {user.name}!</h2>
          <p className="text-green-100 text-lg">Bạn đang truy cập với vai trò Nhân viên</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-md border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-10 h-10 text-blue-600" />
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Hôm nay</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">8</h3>
            <p className="text-sm text-gray-600">Check-in cần xử lý</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-orange-100">
            <div className="flex items-center justify-between mb-4">
              <ClipboardList className="w-10 h-10 text-orange-600" />
              <span className="text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full">Nhiệm vụ</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">15</h3>
            <p className="text-sm text-gray-600">Công việc đang làm</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <Home className="w-10 h-10 text-purple-600" />
              <span className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">Phòng</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">23</h3>
            <p className="text-sm text-gray-600">Homestay quản lý</p>
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-green-600" />
            Nhiệm vụ hôm nay
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <input type="checkbox" className="w-5 h-5 text-green-600 rounded" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Check-in khách hàng - Phòng 101</h4>
                <p className="text-sm text-gray-600">10:00 AM - Nguyễn Văn A</p>
              </div>
              <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Đang chờ</span>
            </div>

            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Kiểm tra phòng - Phòng 205</h4>
                <p className="text-sm text-gray-600">02:00 PM - Dọn dẹp và chuẩn bị</p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">Sắp tới</span>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <input type="checkbox" checked className="w-5 h-5 text-gray-400 rounded" />
              <div className="flex-1 opacity-60">
                <h4 className="font-medium text-gray-900">Check-out khách - Phòng 308</h4>
                <p className="text-sm text-gray-600">08:00 AM - Trần Thị B</p>
              </div>
              <span className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full font-medium">Hoàn thành</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-green-600" />
            Thao tác nhanh
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center transition-colors border border-green-200">
              <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-900 text-sm">Check-in</h4>
            </button>
            <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center transition-colors border border-blue-200">
              <Home className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-900 text-sm">Kiểm tra phòng</h4>
            </button>
            <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center transition-colors border border-purple-200">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-900 text-sm">Khách hàng</h4>
            </button>
            <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-center transition-colors border border-orange-200">
              <ClipboardList className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-900 text-sm">Báo cáo</h4>
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Briefcase className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-green-900 mb-2">Vai trò Nhân viên</h4>
              <p className="text-sm text-green-800">
                Bạn có quyền quản lý check-in/out, kiểm tra phòng và hỗ trợ khách hàng. Liên hệ manager nếu cần trợ giúp.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
