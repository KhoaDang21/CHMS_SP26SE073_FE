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
      const response = await apiService.get<any>(apiConfig.endpoints.userProfile.get);

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
      const response = await apiService.put<any>(apiConfig.endpoints.userProfile.update, payload);
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

  /** Upload avatar — BE không có endpoint riêng cho customer, chưa implement */
  async uploadAvatar(_userId: string | undefined, _file: File): Promise<ProfileResponse> {
    return { success: false, message: 'Chức năng upload avatar chưa được hỗ trợ.' };
  }

  async updatePreferences(_userId: string | undefined, _preferences: Partial<UserProfile>): Promise<ProfileResponse> {
    return { success: false, message: 'Chức năng cập nhật preferences chưa được hỗ trợ.' };
  }

  /** PUT /api/users/profile/password
   * BE ChangePasswordRequestDTO: { currentPassword, newPassword, confirmPassword }
   */
  async updatePassword(_userId: string, formData: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<ProfileResponse> {
    try {
      const response = await apiService.put<any>(apiConfig.endpoints.userProfile.changePassword, {
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
