import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import HomePage from '../pages/HomePage';
import HomestayDetail from '../pages/HomestayDetail';
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
import TicketManagement from '../pages/admin/TicketManagement';
import PromotionManagement from '../pages/admin/PromotionManagement';
import StaffBookings from '../pages/staff/StaffBookings';
import StaffReviews from '../pages/staff/StaffReviews';
import StaffTickets from '../pages/staff/StaffTickets';
import ManagerDashboard from '../pages/manager/ManagerDashboard';
import ManagerBookings from '../pages/manager/ManagerBookings';
import ManagerCustomers from '../pages/manager/ManagerCustomers';
import ManagerReviews from '../pages/manager/ManagerReviews';
import ManagerHomestayManagement from '../pages/manager/ManagerHomestayManagement';
import ManagerHomestayDetailPage from '../pages/manager/ManagerHomestayDetailPage';
import ManagerStaffManagement from '../pages/manager/ManagerStaffManagement';
import ProfilePage from '../pages/customer/ProfilePage';
import MyReviewsPage from '../pages/customer/MyReviewsPage';
import NotificationsPage from '../pages/customer/NotificationsPage';
import BookingExperiencesPage from '../pages/customer/BookingExperiencesPage';
import BookingDiningPage from '../pages/customer/BookingDiningPage';
import LocalExperiencesPage from '../pages/customer/LocalExperiencesPage';
import TravelGuidesPage from '../pages/TravelGuidesPage';
import { authService } from '../services/authService';
import StaffDashboard from '../pages/staff/StaffDashboard';
import ExperienceManagement from '../pages/shared/ExperienceManagement';
import BicycleGamificationPage from '../pages/shared/BicycleGamificationPage';
import ManagerBicycleGamificationPage from '../pages/manager/ManagerBicycleGamificationPage';
import ManagerDiningPage from '../pages/manager/ManagerDiningPage';
import CancellationPoliciesPage from '../pages/admin/CancellationPoliciesPage';
import AdminRefundsPage from '../pages/admin/AdminRefundsPage';
import StaffDiningOrdersPage from '../pages/staff/StaffDiningOrdersPage';

const ROLE_HOME_PATHS: Record<'customer' | 'manager' | 'staff' | 'admin', string> = {
  customer: '/customer/dashboard',
  manager: '/manager/dashboard',
  staff: '/staff/dashboard',
  admin: '/admin/dashboard',
};

function HomeRoute() {
  if (!authService.isAuthenticated()) {
    return <HomePage />;
  }

  const user = authService.getUser();
  const role = user?.role as 'customer' | 'manager' | 'staff' | 'admin' | undefined;
  const redirectPath = role ? ROLE_HOME_PATHS[role] : '/';

  if (!redirectPath || redirectPath === '/') {
    return <HomePage />;
  }

  return <Navigate to={redirectPath} replace />;
}


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
      <Route path="/" element={<HomeRoute />} />
      <Route path="/experiences" element={<LocalExperiencesPage />} />
      <Route path="/travel-guides" element={<TravelGuidesPage />} />
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
        path="/customer/bookings/:bookingId/services"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <BookingExperiencesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/bookings/:bookingId/dining"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <BookingDiningPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/experiences"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <LocalExperiencesPage />
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
      <Route
        path="/customer/notifications"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <NotificationsPage />
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
        path="/manager/staff"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerStaffManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/reviews"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerReviews />
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
      <Route
        path="/manager/experiences"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ExperienceManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/bicycles"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerBicycleGamificationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/dining"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerDiningPage />
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
      <Route
        path="/staff/reviews"
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            <StaffReviews />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/tickets"
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            <StaffTickets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/bicycles"
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            <BicycleGamificationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/dining/orders"
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            <StaffDiningOrdersPage />
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
        path="/admin/experiences"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ExperienceManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bicycles"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ManagerBicycleGamificationPage />
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
      <Route
        path="/admin/promotions"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PromotionManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tickets"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <TicketManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cancellation-policies"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <CancellationPoliciesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/refunds"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminRefundsPage />
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
