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

class ProfileService {
  async getProfile(userId: string): Promise<ProfileResponse> {
    try {
      const response = await apiService.get<ProfileResponse>(`/profile/${userId}`);
      return response;
    } catch (error) {
      console.error('Get profile error:', error);
      return { success: false, message: 'Failed to load profile' };
    }
  }

  async updateProfile(userId: string, data: Partial<UserProfile>): Promise<ProfileResponse> {
    try {
      const response = await apiService.put<ProfileResponse>(`/profile/${userId}`, data);
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: 'Failed to update profile' };
    }
  }

  async uploadAvatar(userId: string, file: File): Promise<ProfileResponse> {
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
    try {
      const response = await apiService.put<ProfileResponse>(`/profile/${userId}/password`, data);
      return response;
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, message: 'Failed to update password' };
    }
  }

  async updatePreferences(userId: string, preferences: Partial<UserProfile>): Promise<ProfileResponse> {
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