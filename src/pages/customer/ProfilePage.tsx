import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2
} from 'lucide-react';
import { authService } from '../../services/authService';
import { profileService, type UserProfile } from '../../services/profileService';
import { toast } from 'sonner';
import PersonalInfoSection from '../../components/profile/PersonalInfoSection';
import SecuritySection from '../../components/profile/SecuritySection';
import PreferencesSection from '../../components/profile/PreferencesSection';
import MainLayout from '../../layouts/MainLayout';

type TabType = 'personal' | 'security' | 'preferences';

const translations = {
  vi: {
    profile: 'Hồ Sơ',
    backToDashboard: 'Quay lại Dashboard',
    personalInfo: 'Thông Tin Cá Nhân',
    security: 'Bảo Mật',
    preferences: 'Cài Đặt',
    loading: 'Đang tải...',
  },
  en: {
    profile: 'Profile',
    backToDashboard: 'Back to Dashboard',
    personalInfo: 'Personal Info',
    security: 'Security',
    preferences: 'Preferences',
    loading: 'Loading...',
  },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const language = profile?.language || 'vi';
  const t = translations[language];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!currentUser) {
      navigate('/auth/login');
      return;
    }

    setIsLoading(true);
    try {
      const result = await profileService.getProfile(currentUser.id);
      if (result.success && result.profile) {
        setProfile(result.profile);
      } else {
        toast.error(result.message || 'Failed to load profile');
      }
    } catch (error) {
      toast.error('An error occurred while loading profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t.loading}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t.profile}</h2>
            <p className="text-gray-600 text-sm">
              {language === 'vi' ? 'Quản lý thông tin cá nhân của bạn' : 'Manage your personal information'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('personal')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'personal'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              {t.personalInfo}
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'security'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              {t.security}
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'preferences'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              {t.preferences}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'personal' && (
            <PersonalInfoSection
              profile={profile}
              onProfileUpdate={handleProfileUpdate}
              language={language}
            />
          )}
          {activeTab === 'security' && (
            <SecuritySection
              userId={profile.id}
              language={language}
            />
          )}
          {activeTab === 'preferences' && (
            <PreferencesSection
              profile={profile}
              onProfileUpdate={handleProfileUpdate}
              language={language}
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
}