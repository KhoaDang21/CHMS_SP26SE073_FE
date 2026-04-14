import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Waves, CheckCircle2 } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

export default function ResetPasswordPage() {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get token from URL (in real app, use React Router)
  // const token = new URLSearchParams(window.location.search).get('token');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.password !== formData.confirmPassword) {
      alert('Mật khẩu không khớp!');
      return;
    }

    if (formData.password.length < 8) {
      alert('Mật khẩu phải có ít nhất 8 ký tự!');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      console.log('Đặt lại mật khẩu:', formData.password);
      setIsSubmitted(true);
      setIsLoading(false);
      // TODO: Call reset password service with token
    }, 1500);
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    if (password.length < 6) return { strength: 25, label: 'Yếu', color: 'bg-red-500' };
    if (password.length < 8) return { strength: 50, label: 'Trung bình', color: 'bg-yellow-500' };
    if (password.length < 12) return { strength: 75, label: 'Tốt', color: 'bg-blue-500' };
    return { strength: 100, label: 'Mạnh', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen flex">
      {/* Left side - Reset Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
              <Waves className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-cyan-900 mb-2">Đặt Lại Mật Khẩu</h1>
            <p className="text-cyan-700">CHMS - Coastal Homestay Management System</p>
          </div>

          {/* Reset Password Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {!isSubmitted ? (
              <>
                <div className="mb-6">
                  <h2 className="text-gray-900 mb-1">Tạo mật khẩu mới</h2>
                  <p className="text-gray-600">
                    Mật khẩu mới của bạn phải khác với mật khẩu đã sử dụng trước đó.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Password Input */}
                  <div>
                    <label htmlFor="password" className="block text-gray-700 mb-2">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        required
                        minLength={8}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">Độ mạnh mật khẩu</span>
                          <span className="text-sm font-medium text-gray-700">
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${passwordStrength.strength}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-500 mt-1">Tối thiểu 8 ký tự</p>
                  </div>

                  {/* Confirm Password Input */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-gray-700 mb-2">
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-sm text-red-500 mt-1">Mật khẩu không khớp</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Đang xử lý...
                      </div>
                    ) : (
                      'Đặt lại mật khẩu'
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                {/* Success State */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-gray-900 mb-2">Mật khẩu đã được đặt lại!</h2>
                  <p className="text-gray-600 mb-6">
                    Mật khẩu của bạn đã được cập nhật thành công. 
                    Bạn có thể đăng nhập với mật khẩu mới ngay bây giờ.
                  </p>

                  <Link
                    to="/auth/login"
                    className="block w-full text-center bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Đăng nhập ngay
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center text-gray-600">
            <p>© 2026 CHMS - SP26SE073</p>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1712311082180-4fd73ded1b1c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMGhvdXNlJTIwdmlsbGF8ZW58MXx8fHwxNzY3NjExODQzfDA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Beach house"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <h2 className="mb-3">Bảo mật tài khoản</h2>
          <p className="text-blue-100 text-lg">
            Tạo một mật khẩu mạnh để bảo vệ tài khoản của bạn. 
            Sử dụng kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.
          </p>
        </div>
      </div>
    </div>
  );
}