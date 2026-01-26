import { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { profileService } from '../../services/profileService';

interface SecuritySectionProps {
  userId: string;
  language: 'vi' | 'en';
}

const translations = {
  vi: {
    title: 'Bảo Mật',
    subtitle: 'Quản lý mật khẩu và cài đặt bảo mật tài khoản',
    changePassword: 'Đổi Mật Khẩu',
    currentPassword: 'Mật Khẩu Hiện Tại',
    newPassword: 'Mật Khẩu Mới',
    confirmPassword: 'Xác Nhận Mật Khẩu',
    updatePassword: 'Cập Nhật Mật Khẩu',
    updating: 'Đang cập nhật...',
    passwordRequirements: 'Mật khẩu phải có ít nhất 6 ký tự',
    twoFactor: 'Xác Thực Hai Yếu Tố',
    twoFactorDesc: 'Thêm một lớp bảo mật cho tài khoản của bạn',
    enable: 'Bật',
    loginHistory: 'Lịch Sử Đăng Nhập',
    viewHistory: 'Xem lịch sử đăng nhập gần đây',
  },
  en: {
    title: 'Security',
    subtitle: 'Manage your password and account security settings',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    updatePassword: 'Update Password',
    updating: 'Updating...',
    passwordRequirements: 'Password must be at least 6 characters',
    twoFactor: 'Two-Factor Authentication',
    twoFactorDesc: 'Add an extra layer of security to your account',
    enable: 'Enable',
    loginHistory: 'Login History',
    viewHistory: 'View recent login activity',
  },
};

export default function SecuritySection({ userId, language }: SecuritySectionProps) {
  const t = translations[language];
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error(language === 'vi' ? 'Mật khẩu mới không khớp' : 'New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error(t.passwordRequirements);
      return;
    }

    setIsUpdating(true);
    try {
      const result = await profileService.updatePassword(userId, formData);
      if (result.success) {
        toast.success(result.message || 'Password updated successfully');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        toast.error(result.message || 'Failed to update password');
      }
    } catch (error) {
      toast.error('An error occurred while updating password');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-1">{t.title}</h3>
        <p className="text-gray-600 text-sm">{t.subtitle}</p>
      </div>

      {/* Change Password Form */}
      <div className="mb-8 pb-8 border-b border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-500" />
          {t.changePassword}
        </h4>

        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.currentPassword}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                required
                className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.newPassword}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                required
                className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">{t.passwordRequirements}</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.confirmPassword}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                required
                className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdating}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
            {isUpdating ? t.updating : t.updatePassword}
          </button>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className="mb-8 pb-8 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">{t.twoFactor}</h4>
              <p className="text-sm text-gray-600">{t.twoFactorDesc}</p>
            </div>
          </div>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            {t.enable}
          </button>
        </div>
      </div>

      {/* Login History */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">{t.loginHistory}</h4>
            <p className="text-sm text-gray-600">{t.viewHistory}</p>
          </div>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            {language === 'vi' ? 'Xem Chi Tiết' : 'View Details'}
          </button>
        </div>

        <div className="space-y-3">
          {[
            { device: 'Chrome on Windows', location: 'Ho Chi Minh City, Vietnam', time: '2 hours ago', current: true },
            { device: 'Safari on iPhone', location: 'Da Nang, Vietnam', time: '1 day ago', current: false },
          ].map((login, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{login.device}</p>
                <p className="text-xs text-gray-600">{login.location}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">{login.time}</p>
                {login.current && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full mt-1">
                    {language === 'vi' ? 'Hiện tại' : 'Current'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}