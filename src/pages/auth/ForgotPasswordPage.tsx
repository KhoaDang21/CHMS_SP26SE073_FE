import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Waves, Send } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log('Gửi email reset mật khẩu tới:', email);
      setIsSubmitted(true);
      setIsLoading(false);
      // TODO: Call forgot password service
    }, 1500);
  };

  const handleResend = () => {
    setIsLoading(true);
    setTimeout(() => {
      console.log('Gửi lại email tới:', email);
      setIsLoading(false);
      alert('Email đã được gửi lại!');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Forgot Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
              <Waves className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-cyan-900 mb-2">Quên Mật Khẩu?</h1>
            <p className="text-cyan-700">CHMS - Coastal Homestay Management System</p>
          </div>

          {/* Forgot Password Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {!isSubmitted ? (
              <>
                <div className="mb-6">
                  <h2 className="text-gray-900 mb-1">Đặt lại mật khẩu</h2>
                  <p className="text-gray-600">
                    Nhập email của bạn và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Input */}
                  <div>
                    <label htmlFor="email" className="block text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Gửi hướng dẫn
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                {/* Success State */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <Mail className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-gray-900 mb-2">Kiểm tra email của bạn!</h2>
                  <p className="text-gray-600 mb-6">
                    Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới{' '}
                    <span className="font-medium text-cyan-700">{email}</span>
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={handleResend}
                      disabled={isLoading}
                      className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Đang gửi...' : 'Gửi lại email'}
                    </button>

                    <Link
                      to="/auth/login"
                      className="block w-full text-center bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Quay lại đăng nhập
                    </Link>
                  </div>
                </div>
              </>
            )}

            {/* Back to Login Link */}
            {!isSubmitted && (
              <div className="mt-6 text-center">
                <Link 
                  to="/auth/login" 
                  className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại đăng nhập
                </Link>
              </div>
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
          src="https://images.unsplash.com/photo-1709826362415-4517dc2ef682?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvY2VhbiUyMHN1bnNldCUyMGNvYXN0YWx8ZW58MXx8fHwxNjc2NjY2NTkxfDA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Ocean sunset"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <h2 className="mb-3">Đừng lo lắng!</h2>
          <p className="text-blue-100 text-lg">
            Việc quên mật khẩu xảy ra với tất cả mọi người. 
            Chỉ cần vài bước đơn giản để lấy lại quyền truy cập.
          </p>
        </div>
      </div>
    </div>
  );
}