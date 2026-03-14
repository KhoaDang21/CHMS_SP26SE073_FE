import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Home,
  BookOpen,
  Compass,
  Heart,
  MessageCircle,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import { authService } from '../../services/authService';
import { profileService, type UserProfile } from '../../services/profileService';
import { toast } from 'sonner';
import PersonalInfoSection from '../../components/profile/PersonalInfoSection';
import SecuritySection from '../../components/profile/SecuritySection';
import PreferencesSection from '../../components/profile/PreferencesSection';
import Header from '../../components/ui/header';

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
  const currentUser = authService.getCurrentUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center max-w-md w-full">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {language === 'vi' ? 'Khong tai duoc ho so' : 'Cannot load profile'}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {language === 'vi'
              ? 'Vui long thu tai lai hoac dang nhap lai.'
              : 'Please try reloading or logging in again.'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all"
            >
              {language === 'vi' ? 'Tai lai' : 'Reload'}
            </button>
            <button
              onClick={() => navigate('/auth/login')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
            >
              {language === 'vi' ? 'Dang nhap lai' : 'Login again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50">
      <Header showMenuButton onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 z-30
          transition-transform duration-300 w-64
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <nav className="p-4 space-y-2">
            <button
              onClick={() => navigate('/customer/dashboard')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
              <Compass className="w-5 h-5" />
              <span className="font-medium">{language === 'vi' ? 'Khám Phá' : 'Explore'}</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">{language === 'vi' ? 'Đặt Phòng' : 'My Bookings'}</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
              <Heart className="w-5 h-5" />
              <span className="font-medium">{language === 'vi' ? 'Yêu Thích' : 'Favorites'}</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">{language === 'vi' ? 'Tin Nhắn' : 'Messages'}</span>
            </button>
            <button
              onClick={() => navigate('/customer/profile')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
            >
              <UserIcon className="w-5 h-5" />
              <span className="font-medium">{language === 'vi' ? 'Hồ Sơ' : 'Profile'}</span>
            </button>
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navigate('/customer/dashboard')}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>
              <div>
                <h2 className="text-gray-900">{t.profile}</h2>
                <p className="text-gray-600 text-sm">{language === 'vi' ? 'Quản lý thông tin cá nhân của bạn' : 'Manage your personal information'}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('personal')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                    activeTab === 'personal'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t.personalInfo}
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                    activeTab === 'security'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t.security}
                </button>
                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                    activeTab === 'preferences'
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
        </main>
      </div>
    </div>
  );
}
