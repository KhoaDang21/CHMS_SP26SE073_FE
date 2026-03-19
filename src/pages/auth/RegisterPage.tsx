import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Waves, User, Phone, Home } from 'lucide-react';
import { Button } from '../../components/ui/button';
import toast from 'react-hot-toast';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { authService } from '../../services/authService';
import { authConfig } from '../../config/authConfig';
import OTPModal from '../../components/auth/OTPModal';
import { minDelay } from '../../utils/minDelay';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu không khớp!');
      return;
    }
    
    if (!agreeTerms) {
      setError('Vui lòng đồng ý với điều khoản sử dụng!');
      return;
    }

    const { passwordRequirements } = authConfig;
    if (formData.password.length < passwordRequirements.minLength) {
      setError(`Mật khẩu phải có ít nhất ${passwordRequirements.minLength} ký tự`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await minDelay(authService.register({
        email: formData.email,
        password: formData.password,
        name: formData.fullName,
        phone: formData.phone,
        role: 'customer',
      }));

      if (response.success) {
        toast.success('Mã OTP đã được gửi đến email của bạn!');
        setShowOTPModal(true);
      } else {
        setError(response.message || 'Đăng ký thất bại. Vui lòng thử lại.');
        toast.error(response.message || 'Đăng ký thất bại!');
      }
    } catch (err) {
      console.error('Register error:', err);
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      toast.error('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (otpCode: string) => {
    setOtpError('');
    setIsVerifying(true);

    try {
      const response = await minDelay(authService.verifyOtp(formData.email, otpCode));

      if (response.success) {
        toast.success('✅ Xác thực thành công! Đang chuyển hướng...', {
          duration: 2000,
        });
        
        setShowOTPModal(false);
        
        setTimeout(() => {
          const userRole = response.user?.role || 'customer';
          const redirectPath = authConfig.redirectPaths[userRole];
          navigate(redirectPath, { replace: true });
        }, 1500);
      } else {
        setOtpError(response.message || 'Mã OTP không hợp lệ');
        toast.error(response.message || 'Mã OTP không hợp lệ!');
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      setOtpError('Đã xảy ra lỗi. Vui lòng thử lại.');
      toast.error('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="relative min-h-screen flex">
      <div className="absolute top-4 left-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/" aria-label="Trang chủ" className="inline-flex items-center gap-2">
            <Home className="w-4 h-4 text-cyan-700" />
            <span className="text-sm text-cyan-700">Trang chủ</span>
          </Link>
        </Button>
      </div>
      {/* Left side - Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
              <Waves className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-cyan-900 mb-2">Tạo Tài Khoản</h1>
            <p className="text-sm text-cyan-700">CHMS - Coastal Homestay Management System</p>
          </div>

          {/* Register Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Đăng Ký</h2>
              <p className="text-sm text-gray-600">Tham gia cùng chúng tôi ngay hôm nay!</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name Input */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm"
                    required
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Phone Input */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Số điện thoại
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0123456789"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm"
                    required
                    disabled={isLoading}
                    autoComplete="tel"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm"
                    required
                    minLength={8}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Tối thiểu 8 ký tự</p>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Terms Agreement */}
              <div>
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500 cursor-pointer"
                    required
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Tôi đồng ý với{' '}
                    <a href="/terms" className="text-cyan-600 hover:text-cyan-700 transition-colors">
                      Điều khoản sử dụng
                    </a>{' '}
                    và{' '}
                    <a href="/privacy" className="text-cyan-600 hover:text-cyan-700 transition-colors">
                      Chính sách bảo mật
                    </a>
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2.5 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang đăng ký...
                  </span>
                ) : (
                  'Đăng Ký'
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Đã có tài khoản?{' '}
                <Link to="/auth/login" className="text-cyan-600 hover:text-cyan-700 transition-colors font-medium">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>© 2026 CHMS - SP26SE073</p>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1558117338-aa433feb1c62?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMGJlYWNoJTIwcmVzb3J0fGVufDF8fHx8MTc2NzU5OTgyNXww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Tropical beach resort"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <h2 className="text-2xl font-bold mb-3">Bắt đầu hành trình của bạn</h2>
          <p className="text-blue-100 text-lg">
            Tham gia cộng đồng quản lý homestay chuyên nghiệp. 
            Đăng ký ngay để trải nghiệm đầy đủ tính năng của CHMS.
          </p>
        </div>
      </div>

      <OTPModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        onVerify={handleVerifyOTP}
        email={formData.email}
        isLoading={isVerifying}
        error={otpError}
      />
    </div>
  );
}