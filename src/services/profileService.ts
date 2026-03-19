import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';

export interface UserProfile {
  id?: string;
  fullName: string;
  name?: string;
  email: string;
  phone: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  city?: string;
  country?: string;
  language?: string;
  currency?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  marketingEmails?: boolean;
}

export interface ProfileResponse {
  success: boolean;
  message?: string;
  profile?: UserProfile;
  avatarUrl?: string;
}

class ProfileService {
  async getProfile(_userId?: string): Promise<ProfileResponse> {
    const response = await apiService.get<any>(apiConfig.endpoints.auth.profile);

    if (!response?.success) {
      return {
        success: false,
        message: response?.message || 'Failed to load profile',
      };
    }

    const data = (response.data ?? response.profile ?? response) as Record<string, any> | null;

    if (!data) {
      return { success: false, message: response.message || 'Profile not found' };
    }

    const profile: UserProfile = {
      id: data.id ?? data.userId ?? '',
      fullName: data.fullName ?? data.name ?? '',
      name: data.fullName ?? data.name ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
      avatar: data.avatar ?? data.avatarUrl ?? '',
      dateOfBirth: data.dateOfBirth ?? '',
      gender: data.gender ?? 'male',
      nationality: data.nationality ?? '',
      address: data.address ?? '',
      city: data.city ?? '',
      country: data.country ?? '',
      language: data.language ?? 'vi',
      currency: data.currency ?? 'VND',
      emailNotifications: data.emailNotifications ?? true,
      smsNotifications: data.smsNotifications ?? false,
      marketingEmails: data.marketingEmails ?? false,
    };

    return { success: true, message: response.message, profile };
  }

  async updateProfile(_userId: string | undefined, formData: Partial<UserProfile>): Promise<ProfileResponse> {
    try {
      const response = await apiService.put<any>(apiConfig.endpoints.auth.profile, formData);
      if (!response?.success) {
        return { success: false, message: response?.message || 'Failed to update profile' };
      }
      const data = response.data ?? response.profile ?? response;
      return { success: true, message: response.message, profile: data as UserProfile };
    } catch {
      return { success: false, message: 'Failed to update profile' };
    }
  }

  async uploadAvatar(_userId: string | undefined, file: File): Promise<ProfileResponse> {
    try {
      const form = new FormData();
      form.append('avatar', file);
      const response = await apiService.post<any>(`${apiConfig.endpoints.auth.profile}/avatar`, form);
      if (!response?.success) {
        return { success: false, message: response?.message || 'Failed to upload avatar' };
      }
      return { success: true, message: response.message, avatarUrl: response.data?.avatarUrl ?? response.avatarUrl ?? '' };
    } catch {
      return { success: false, message: 'Failed to upload avatar' };
    }
  }

  async updatePreferences(_userId: string | undefined, preferences: Partial<UserProfile>): Promise<ProfileResponse> {
    try {
      const response = await apiService.put<any>(`${apiConfig.endpoints.auth.profile}/preferences`, preferences);
      if (!response?.success) {
        return { success: false, message: response?.message || 'Failed to update preferences' };
      }
      const data = response.data ?? response.profile ?? response;
      return { success: true, message: response.message, profile: data as UserProfile };
    } catch {
      return { success: false, message: 'Failed to update preferences' };
    }
  }

  async updatePassword(_userId: string, formData: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<ProfileResponse> {
    try {
      const response = await apiService.put<any>(`${apiConfig.endpoints.auth.profile}/password`, formData);
      if (!response?.success) {
        return { success: false, message: response?.message || 'Failed to update password' };
      }
      return { success: true, message: response.message };
    } catch {
      return { success: false, message: 'Failed to update password' };
    }
  }
}

export const profileService = new ProfileService();
