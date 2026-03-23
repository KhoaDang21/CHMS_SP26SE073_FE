import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import HomePage from '../pages/HomePage';
import HomestayDetail from '../pages/HomestayDetail';
import ExplorePage from '../pages/ExplorePage';
import AboutPage from '../pages/AboutPage';
import ContactPage from '../pages/ContactPage';
import CustomerDashboard from '../pages/customer/CustomerDashboard';
import CustomerExplorePage from '../pages/customer/ExplorePage';
import BookingsPage from '../pages/customer/BookingsPage';
import FavoritesPage from '../pages/customer/FavoritesPage';
import SupportPage from '../pages/customer/SupportPage';
import PaymentResultPage from '../pages/customer/PaymentResultPage';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AmenityManagement from '../pages/admin/AmenityManagement';
import HomestayManagement from '../pages/admin/HomestayManagement';
import HomestayDetailPage from '../pages/admin/HomestayDetailPage';
import StaffManagement from '../pages/admin/StaffManagement';
import BookingManagement from '../pages/admin/BookingManagement';
import CustomerManagement from '../pages/admin/CustomerManagement';
import RevenueReport from '../pages/admin/RevenueReport';
import StaffBookings from '../pages/staff/StaffBookings';
import ManagerDashboard from '../pages/manager/ManagerDashboard';
import ManagerBookings from '../pages/manager/ManagerBookings';
import ManagerCustomers from '../pages/manager/ManagerCustomers';
import ManagerHomestayManagement from '../pages/manager/ManagerHomestayManagement';
import ManagerHomestayDetailPage from '../pages/manager/ManagerHomestayDetailPage';
import ProfilePage from '../pages/customer/ProfilePage';
import MyReviewsPage from '../pages/customer/MyReviewsPage';
import { authService } from '../services/authService';
import StaffDashboard from '../pages/staff/StaffDashboard';

// Protected Route Component
function ProtectedRoute({
  children,
  allowedRoles
}: {
  children: React.ReactNode;
  allowedRoles?: Array<'customer' | 'manager' | 'staff' | 'admin'>;
}) {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getUser();

  if (!isAuthenticated) {
    // Chưa đăng nhập -> redirect về home
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Không có quyền truy cập -> redirect về trang phù hợp với role
    const redirectPaths: Record<string, string> = {
      customer: '/customer/dashboard',
      manager: '/manager/dashboard',
      staff: '/staff/dashboard',
      admin: '/admin/dashboard',
    };
    return <Navigate to={redirectPaths[user.role] || '/'} replace />;
  }

  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/homestays/:id" element={<HomestayDetail />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

      {/* Protected Routes - Customer */}
      <Route
        path="/customer/dashboard"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/profile"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/explore"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerExplorePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/bookings"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <BookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/favorites"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <FavoritesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/messages"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <SupportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/payment-result"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <PaymentResultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/reviews"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <MyReviewsPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Manager */}
      <Route
        path="/manager/dashboard"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/bookings"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerBookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/customers"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerCustomers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/homestays"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerHomestayManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/homestays/:id"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerHomestayDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Staff */}
      <Route
        path="/staff/dashboard"
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            <StaffDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/bookings"
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            <StaffBookings />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Admin */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/homestays"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <HomestayManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/homestays/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <HomestayDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/amenities"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AmenityManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/staff"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <StaffManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bookings"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <BookingManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <CustomerManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/revenue"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <RevenueReport />
          </ProtectedRoute>
        }
      />

      {/* Unauthorized */}
      <Route
        path="/unauthorized"
        element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-red-600 mb-4">403</h1>
              <p className="text-xl text-gray-700 mb-4">Bạn không có quyền truy cập trang này</p>
              <a href="/auth/login" className="text-blue-600 hover:underline">
                Quay về trang đăng nhập
              </a>
            </div>
          </div>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
