import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
// Import other auth pages when created
// import RegisterPage from '../pages/auth/RegisterPage';
// import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
// import ResetPasswordPage from '../pages/auth/ResetPasswordPage';

export default function AuthRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Uncomment when pages are created */}
      {/* <Route path="/register" element={<RegisterPage />} /> */}
      {/* <Route path="/forgot-password" element={<ForgotPasswordPage />} /> */}
      {/* <Route path="/reset-password" element={<ResetPasswordPage />} /> */}
      
      {/* Redirect /auth to /auth/login */}
      <Route path="/" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  );
}
