import type { ReactNode } from 'react';
import { Waves } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AuthLayout({ 
  children, 
  title = 'Hệ Thống Quản Trị',
  subtitle = 'CHMS - Coastal Homestay Management System'
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
              <Waves className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-cyan-900 mb-2">{title}</h1>
            <p className="text-cyan-700">{subtitle}</p>
          </div>

          {/* Content */}
          {children}

          {/* Additional Info */}
          <div className="mt-6 text-center text-gray-600">
            <p>© 2026 CHMS - SP26SE073</p>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4"
          alt="Beach homestay"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <h2 className="mb-3">Quản lý homestay chuyên nghiệp</h2>
          <p className="text-blue-100 text-lg">
            Nền tảng quản trị toàn diện cho các homestay ven biển. 
            Quản lý đặt phòng, khách hàng và doanh thu một cách dễ dàng.
          </p>
        </div>
      </div>
    </div>
  );
}