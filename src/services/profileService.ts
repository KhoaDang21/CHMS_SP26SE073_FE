import { apiService } from './apiService';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  city?: string;
  country?: string;
  language: 'vi' | 'en';
  currency: 'VND' | 'USD';
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
}

interface ProfileResponse {
  success: boolean;
  message?: string;
  profile?: UserProfile;
  avatarUrl?: string;
}

// Mock data
const MOCK_PROFILE: UserProfile = {
  id: 'user123',
  name: 'Nguyễn Văn A',
  email: 'customer@example.com',
  phone: '0123456789',
  avatar: 'https://i.pravatar.cc/150?img=12',
  dateOfBirth: '1990-01-15',
  gender: 'male',
  nationality: 'Việt Nam',
  address: '123 Đường Lê Lợi, Quận 1',
  city: 'TP. Hồ Chí Minh',
  country: 'Việt Nam',
  language: 'vi',
  currency: 'VND',
  emailNotifications: true,
  smsNotifications: false,
  marketingEmails: true,
};

class ProfileService {
  private USE_MOCK = true; // Đổi thành false khi có API thật

  async getProfile(userId: string): Promise<ProfileResponse> {
    if (this.USE_MOCK) {
      // Mock delay để giống API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        profile: { ...MOCK_PROFILE, id: userId }
      };
    }

    try {
      const response = await apiService.get<ProfileResponse>(`/profile/${userId}`);
      return response;
    } catch (error) {
      console.error('Get profile error:', error);
      return { success: false, message: 'Failed to load profile' };
    }
  }

  async updateProfile(userId: string, data: Partial<UserProfile>): Promise<ProfileResponse> {
    if (this.USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Cập nhật mock data
      Object.assign(MOCK_PROFILE, data);
      
      return {
        success: true,
        message: 'Cập nhật thông tin thành công!',
        profile: { ...MOCK_PROFILE, id: userId }
      };
    }

    try {
      const response = await apiService.put<ProfileResponse>(`/profile/${userId}`, data);
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: 'Failed to update profile' };
    }
  }

  async uploadAvatar(userId: string, file: File): Promise<ProfileResponse> {
    if (this.USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Tạo URL giả cho avatar
      const mockAvatarUrl = URL.createObjectURL(file);
      MOCK_PROFILE.avatar = mockAvatarUrl;
      
      return {
        success: true,
        message: 'Tải ảnh lên thành công!',
        avatarUrl: mockAvatarUrl,
        profile: { ...MOCK_PROFILE, id: userId }
      };
    }

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await apiService.upload<ProfileResponse>(`/profile/${userId}/avatar`, formData);
      return response;
    } catch (error) {
      console.error('Upload avatar error:', error);
      return { success: false, message: 'Failed to upload avatar' };
    }
  }

  async updatePassword(userId: string, data: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<ProfileResponse> {
    if (this.USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Giả lập kiểm tra mật khẩu hiện tại
      if (data.currentPassword !== 'password123') {
        return {
          success: false,
          message: 'Mật khẩu hiện tại không đúng'
        };
      }
      
      return {
        success: true,
        message: 'Đổi mật khẩu thành công!'
      };
    }

    try {
      const response = await apiService.put<ProfileResponse>(`/profile/${userId}/password`, data);
      return response;
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, message: 'Failed to update password' };
    }
  }

  async updatePreferences(userId: string, preferences: Partial<UserProfile>): Promise<ProfileResponse> {
    if (this.USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Cập nhật preferences
      Object.assign(MOCK_PROFILE, preferences);
      
      return {
        success: true,
        message: 'Cập nhật cài đặt thành công!',
        profile: { ...MOCK_PROFILE, id: userId }
      };
    }

    try {
      const response = await apiService.put<ProfileResponse>(`/profile/${userId}/preferences`, preferences);
      return response;
    } catch (error) {
      console.error('Update preferences error:', error);
      return { success: false, message: 'Failed to update preferences' };
    }
  }
}

export const profileService = new ProfileService();