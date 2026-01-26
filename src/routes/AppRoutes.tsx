import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import CustomerDashboard from '../pages/customer/CustomerDashboard';
import { authService } from '../services/authService';
import ProfilePage from '../pages/customer/ProfilePage';

// Protected Route Component
function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles?: Array<'customer' | 'owner' | 'staff' | 'admin'>;
}) {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getUser();

  if (!isAuthenticated) {
    // Chưa đăng nhập -> redirect về login
    return <Navigate to="/auth/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Không có quyền truy cập -> redirect về trang phù hợp với role
    const redirectPaths: Record<string, string> = {
      customer: '/customer/dashboard',
      owner: '/owner/dashboard',
      staff: '/staff/dashboard',
      admin: '/admin/dashboard',
    };
    return <Navigate to={redirectPaths[user.role] || '/auth/login'} replace />;
  }

  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Navigate to="/auth/login" replace />} />
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

      {/* Protected Routes - Owner (add later) */}
      {/* <Route 
        path="/owner/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['owner']}>
            <OwnerDashboard />
          </ProtectedRoute>
        } 
      /> */}

      {/* Protected Routes - Staff (add later) */}
      {/* <Route 
        path="/staff/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            <StaffDashboard />
          </ProtectedRoute>
        } 
      /> */}

      {/* Protected Routes - Admin (add later) */}
      {/* <Route 
        path="/admin/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      /> */}

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

      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  );
}
