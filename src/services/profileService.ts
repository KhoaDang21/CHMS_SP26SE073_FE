import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';

// BE GetUserProfileResponseDTO: { fullName, email, phone }
// BE UpdateUserProfileRequestDTO: { fullName, phoneNumber, avatarUrl }
// BE ChangePasswordRequestDTO: { currentPassword, newPassword, confirmPassword }
// NOTE: Only GET /api/users/profile exists in BE currently.
// PUT /api/users/profile and password change endpoints are not yet implemented.

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
  /** GET /api/users/profile — lấy profile của user hiện tại */
  async getProfile(_userId?: string): Promise<ProfileResponse> {
    try {
      const response = await apiService.get<any>(apiConfig.endpoints.auth.profile);

      if (!response?.success) {
        return {
          success: false,
          message: response?.message || 'Failed to load profile',
        };
      }

      // BE returns: { fullName, email, phone }
      const data = response.data ?? response.profile ?? response;

      if (!data) {
        return { success: false, message: response.message || 'Profile not found' };
      }

      const profile: UserProfile = {
        id: data.id ?? '',
        fullName: data.fullName ?? data.name ?? '',
        name: data.fullName ?? data.name ?? '',
        email: data.email ?? '',
        // BE field is 'phone' (not phoneNumber)
        phone: data.phone ?? data.phoneNumber ?? '',
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
    } catch {
      return { success: false, message: 'Failed to load profile' };
    }
  }

  /** PUT /api/users/profile — cập nhật profile
   * BE UpdateUserProfileRequestDTO: { fullName, phoneNumber, avatarUrl }
   */
  async updateProfile(_userId: string | undefined, formData: Partial<UserProfile>): Promise<ProfileResponse> {
    try {
      const payload = {
        fullName: formData.fullName ?? formData.name ?? '',
        phoneNumber: formData.phone ?? '',   // BE field is 'phoneNumber'
        avatarUrl: formData.avatar ?? '',
      };
      const response = await apiService.put<any>(apiConfig.endpoints.auth.profile, payload);
      if (!response?.success) {
        return { success: false, message: response?.message || 'Failed to update profile' };
      }
      // BE UpdateUserProfileResponseDTO: { fullName, phone }
      const data = response.data ?? {};
      return {
        success: true,
        message: response.message,
        profile: {
          ...formData,
          fullName: data.fullName ?? formData.fullName ?? '',
          phone: data.phone ?? formData.phone ?? '',
        } as UserProfile,
      };
    } catch {
      return { success: false, message: 'Failed to update profile' };
    }
  }

  /** POST /api/employees/{id}/avatar — upload avatar (employee only)
   * For customer profile avatar, BE doesn't have a dedicated endpoint yet.
   */
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

  /** PUT /api/users/profile/password
   * BE ChangePasswordRequestDTO: { currentPassword, newPassword, confirmPassword }
   */
  async updatePassword(_userId: string, formData: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<ProfileResponse> {
    try {
      const response = await apiService.put<any>(`${apiConfig.endpoints.auth.profile}/password`, {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });
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
