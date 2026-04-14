import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Waves } from 'lucide-react';
import toast from 'react-hot-toast';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { authService } from '../../services/authService';
import ResetPasswordModal from '../../components/auth/ResetPasswordModal';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authService.forgotPassword(email);

      if (response.success) {
        setIsSubmitted(true);
        toast.success('Mã OTP đã được gửi đến email của bạn!');
        setTimeout(() => setShowResetModal(true), 1000);
      } else {
        toast.error(response.message || 'Không tìm thấy email này!');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      toast.error('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (otpCode: string, newPassword: string) => {
    setResetError('');
    setIsResetting(true);

    try {
      const response = await authService.resetPassword(email, otpCode, newPassword);

      if (response.success) {
        toast.success('✅ Đặt lại mật khẩu thành công!');
        setShowResetModal(false);
        setTimeout(() => navigate('/auth/login', { replace: true }), 1500);
      } else {
        setResetError(response.message || 'Mã OTP không hợp lệ');
        toast.error(response.message || 'Đặt lại mật khẩu thất bại!');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setResetError('Đã xảy ra lỗi. Vui lòng thử lại.');
      toast.error('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="relative h-screen flex overflow-hidden">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="w-full max-w-md">
          {/* Logo and Title - Compact */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-3">
              <Waves className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-cyan-900 mb-1">Quên Mật Khẩu</h1>
            <p className="text-xs text-cyan-700">CHMS - Coastal Homestay Management System</p>
          </div>

          {/* Form Card - Compact */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            {!isSubmitted ? (
              <>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Khôi Phục Mật Khẩu</h2>
                  <p className="text-xs text-gray-600">
                    Nhập email của bạn và chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Địa chỉ Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Nhập email đã đăng ký"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm"
                        required
                        disabled={isLoading}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2.5 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang gửi...
                      </span>
                    ) : (
                      'Gửi Mã OTP'
                    )}
                  </button>
                </form>

                <div className="mt-4">
                  <Link
                    to="/auth/login"
                    className="flex items-center justify-center text-sm text-cyan-600 hover:text-cyan-700 transition-colors font-medium"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Quay lại đăng nhập
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-3">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Mã OTP Đã Được Gửi!</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Chúng tôi đã gửi mã OTP đến email:
                </p>
                <p className="text-sm font-medium text-cyan-600 mb-3">{email}</p>
                <p className="text-xs text-gray-500 mb-4">
                  Vui lòng kiểm tra cả thư mục spam nếu không thấy email.
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => setShowResetModal(true)}
                    className="block w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2.5 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
                  >
                    Nhập Mã OTP
                  </button>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="block w-full text-sm text-cyan-600 hover:text-cyan-700 transition-colors font-medium py-1"
                  >
                    Gửi lại mã OTP
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Compact */}
          <div className="mt-4 text-center text-xs text-gray-500">
            <p>© 2026 CHMS - SP26SE073</p>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1505142468610-359e7d316be0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMHN1bnNldHxlbnwxfHx8fDE3Mzk1OTk4MjV8MA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Beach sunset"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <h2 className="text-xl font-bold mb-2">Đừng lo lắng!</h2>
          <p className="text-blue-100">
            Chúng tôi sẽ giúp bạn khôi phục mật khẩu một cách nhanh chóng và an toàn.
          </p>
        </div>
      </div>

      <ResetPasswordModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onReset={handleResetPassword}
        email={email}
        isLoading={isResetting}
        error={resetError}
      />
    </div>
  );
}