import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';

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

class ProfileService {
  private normalizeProfile(raw: any, fallbackId?: string): UserProfile {
    return {
      id: raw?.id || raw?.userId || fallbackId || '',
      name: raw?.name || raw?.fullName || '',
      email: raw?.email || '',
      phone: raw?.phone || raw?.phoneNumber || '',
      avatar: raw?.avatar || raw?.avatarUrl || '',
      dateOfBirth: raw?.dateOfBirth || '',
      gender: raw?.gender || 'male',
      nationality: raw?.nationality || '',
      address: raw?.address || '',
      city: raw?.city || '',
      country: raw?.country || 'Vietnam',
      language: raw?.language === 'en' ? 'en' : 'vi',
      currency: raw?.currency === 'USD' ? 'USD' : 'VND',
      emailNotifications: raw?.emailNotifications ?? true,
      smsNotifications: raw?.smsNotifications ?? true,
      marketingEmails: raw?.marketingEmails ?? false,
    };
  }

  async getProfile(_userId?: string): Promise<ProfileResponse> {
    try {
      const response = await apiService.get<any>(
        apiConfig.endpoints.auth.profile,
      );

      if (!response?.success) {
        return {
          success: false,
          message: response?.message || 'Failed to load profile',
        };
      }

      const rawProfile = response.profile || response.data || response;
      return {
        success: true,
        message: response.message,
        profile: this.normalizeProfile(rawProfile, _userId),
      };
    } catch (error) {
      console.error('Get profile error:', error);
      return { success: false, message: 'Failed to load profile' };
    }
  }

  async updateProfile(_userId: string, data: Partial<UserProfile>): Promise<ProfileResponse> {
    try {
      const response = await apiService.put<any>(
        apiConfig.endpoints.auth.profile,
        data,
      );

      if (!response?.success) {
        return {
          success: false,
          message: response?.message || 'Failed to update profile',
        };
      }

      const rawProfile = response.profile || response.data || data;
      return {
        success: true,
        message: response.message,
        profile: this.normalizeProfile(rawProfile, _userId),
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: 'Failed to update profile' };
    }
  }

  async uploadAvatar(_userId: string, file: File): Promise<ProfileResponse> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await apiService.upload<any>(
        `${apiConfig.endpoints.auth.profile}/avatar`,
        formData,
      );

      return {
        success: !!response?.success,
        message: response?.message,
        avatarUrl: response?.avatarUrl || response?.data?.avatarUrl || response?.data?.avatar,
      };
    } catch (error) {
      console.error('Upload avatar error:', error);
      return { success: false, message: 'Failed to upload avatar' };
    }
  }

  async updatePassword(_userId: string, data: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<ProfileResponse> {
    try {
      const response = await apiService.put<ProfileResponse>(
        `${apiConfig.endpoints.auth.profile}/password`,
        data,
      );
      return response;
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, message: 'Failed to update password' };
    }
  }

  async updatePreferences(_userId: string, preferences: Partial<UserProfile>): Promise<ProfileResponse> {
    try {
      const response = await apiService.put<any>(
        `${apiConfig.endpoints.auth.profile}/preferences`,
        preferences,
      );

      if (!response?.success) {
        return {
          success: false,
          message: response?.message || 'Failed to update preferences',
        };
      }

      const rawProfile = response.profile || response.data || preferences;
      return {
        success: true,
        message: response.message,
        profile: this.normalizeProfile(rawProfile, _userId),
      };
    } catch (error) {
      console.error('Update preferences error:', error);
      return { success: false, message: 'Failed to update preferences' };
    }
  }
}

export const profileService = new ProfileService();