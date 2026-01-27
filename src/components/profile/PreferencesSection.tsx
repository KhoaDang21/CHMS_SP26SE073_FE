import { useState } from 'react';
import { Globe, DollarSign, Bell, Mail, MessageCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { profileService, type UserProfile } from '../../services/profileService';

interface PreferencesSectionProps {
  profile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
  language: 'vi' | 'en';
}

const translations = {
  vi: {
    title: 'Cài Đặt & Sở Thích',
    subtitle: 'Tùy chỉnh trải nghiệm sử dụng của bạn',
    languageCurrency: 'Ngôn Ngữ & Tiền Tệ',
    languageLabel: 'Ngôn Ngữ',
    currencyLabel: 'Tiền Tệ',
    vietnamese: 'Tiếng Việt',
    english: 'English',
    notifications: 'Thông Báo',
    emailNotifications: 'Thông Báo Email',
    emailNotificationsDesc: 'Nhận thông báo về đặt phòng và cập nhật qua email',
    smsNotifications: 'Thông Báo SMS',
    smsNotificationsDesc: 'Nhận thông báo quan trọng qua tin nhắn',
    marketingEmails: 'Email Khuyến Mãi',
    marketingEmailsDesc: 'Nhận thông tin về ưu đãi và khuyến mãi đặc biệt',
    saveChanges: 'Lưu Thay Đổi',
    saving: 'Đang lưu...',
  },
  en: {
    title: 'Preferences & Settings',
    subtitle: 'Customize your experience',
    languageCurrency: 'Language & Currency',
    languageLabel: 'Language',
    currencyLabel: 'Currency',
    vietnamese: 'Tiếng Việt',
    english: 'English',
    notifications: 'Notifications',
    emailNotifications: 'Email Notifications',
    emailNotificationsDesc: 'Receive booking and update notifications via email',
    smsNotifications: 'SMS Notifications',
    smsNotificationsDesc: 'Receive important notifications via text message',
    marketingEmails: 'Marketing Emails',
    marketingEmailsDesc: 'Receive information about special offers and promotions',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
  },
};

export default function PreferencesSection({ profile, onProfileUpdate, language }: PreferencesSectionProps) {
  const t = translations[language];
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    language: profile.language,
    currency: profile.currency,
    emailNotifications: profile.emailNotifications,
    smsNotifications: profile.smsNotifications,
    marketingEmails: profile.marketingEmails,
  });

  const handlePreferenceChange = (field: string, value: string | boolean) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await profileService.updatePreferences(profile.id, preferences);
      if (result.success && result.profile) {
        onProfileUpdate(result.profile);
        toast.success(result.message || 'Preferences updated successfully');
      } else {
        toast.error(result.message || 'Failed to update preferences');
      }
    } catch (error) {
      toast.error('An error occurred while updating preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = 
    preferences.language !== profile.language ||
    preferences.currency !== profile.currency ||
    preferences.emailNotifications !== profile.emailNotifications ||
    preferences.smsNotifications !== profile.smsNotifications ||
    preferences.marketingEmails !== profile.marketingEmails;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-1">{t.title}</h3>
        <p className="text-gray-600 text-sm">{t.subtitle}</p>
      </div>

      {/* Language & Currency */}
      <div className="mb-8 pb-8 border-b border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-500" />
          {t.languageCurrency}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.languageLabel}</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={preferences.language}
                onChange={(e) => handlePreferenceChange('language', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none bg-white"
              >
                <option value="vi">{t.vietnamese}</option>
                <option value="en">{t.english}</option>
              </select>
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.currencyLabel}</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={preferences.currency}
                onChange={(e) => handlePreferenceChange('currency', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none bg-white"
              >
                <option value="VND">VND (₫)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="mb-8">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-500" />
          {t.notifications}
        </h4>

        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-1">{t.emailNotifications}</h5>
                <p className="text-sm text-gray-600">{t.emailNotificationsDesc}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-cyan-500"></div>
            </label>
          </div>

          {/* SMS Notifications */}
          <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-1">{t.smsNotifications}</h5>
                <p className="text-sm text-gray-600">{t.smsNotificationsDesc}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.smsNotifications}
                onChange={(e) => handlePreferenceChange('smsNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-cyan-500"></div>
            </label>
          </div>

          {/* Marketing Emails */}
          <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-1">{t.marketingEmails}</h5>
                <p className="text-sm text-gray-600">{t.marketingEmailsDesc}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.marketingEmails}
                onChange={(e) => handlePreferenceChange('marketingEmails', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-cyan-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex items-center justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? t.saving : t.saveChanges}
          </button>
        </div>
      )}
    </div>
  );
}