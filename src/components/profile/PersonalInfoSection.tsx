import { useState } from 'react';
import { User, Mail, Phone, Calendar, MapPin, Globe, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { profileService, type UserProfile } from '../../services/profileService';

interface PersonalInfoSectionProps {
  profile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
  language: 'vi' | 'en';
}

const translations = {
  vi: {
    title: 'Thông Tin Cá Nhân',
    subtitle: 'Cập nhật thông tin cá nhân và ảnh đại diện của bạn',
    fullName: 'Họ và Tên',
    email: 'Email',
    phone: 'Số Điện Thoại',
    dateOfBirth: 'Ngày Sinh',
    gender: 'Giới Tính',
    male: 'Nam',
    female: 'Nữ',
    other: 'Khác',
    nationality: 'Quốc Tịch',
    address: 'Địa Chỉ',
    city: 'Thành Phố',
    country: 'Quốc Gia',
    uploadPhoto: 'Tải ảnh lên',
    saveChanges: 'Lưu Thay Đổi',
    cancel: 'Hủy',
    saving: 'Đang lưu...',
  },
  en: {
    title: 'Personal Information',
    subtitle: 'Update your personal information and profile photo',
    fullName: 'Full Name',
    email: 'Email',
    phone: 'Phone Number',
    dateOfBirth: 'Date of Birth',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    nationality: 'Nationality',
    address: 'Address',
    city: 'City',
    country: 'Country',
    uploadPhoto: 'Upload Photo',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    saving: 'Saving...',
  },
};

export default function PersonalInfoSection({ profile, onProfileUpdate, language }: PersonalInfoSectionProps) {
  const t = translations[language];
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    name: profile.name,
    phone: profile.phone || '',
    dateOfBirth: profile.dateOfBirth || '',
    gender: profile.gender || 'male',
    nationality: profile.nationality || '',
    address: profile.address || '',
    city: profile.city || '',
    country: profile.country || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await profileService.updateProfile(profile.id, formData);
      if (result.success && result.profile) {
        onProfileUpdate(result.profile);
        setIsEditing(false);
        toast.success(result.message || t.saveChanges);
      } else {
        toast.error(result.message || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('An error occurred while updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile.name,
      phone: profile.phone || '',
      dateOfBirth: profile.dateOfBirth || '',
      gender: profile.gender || 'male',
      nationality: profile.nationality || '',
      address: profile.address || '',
      city: profile.city || '',
      country: profile.country || '',
    });
    setIsEditing(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(language === 'vi' ? 'Vui lòng chọn file hình ảnh' : 'Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === 'vi' ? 'Kích thước file không được vượt quá 5MB' : 'File size must not exceed 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const result = await profileService.uploadAvatar(profile.id, file);
      if (result.success && result.avatarUrl) {
        onProfileUpdate({ ...profile, avatar: result.avatarUrl });
        window.dispatchEvent(new CustomEvent('profile-avatar-updated', { detail: result.avatarUrl }));
        toast.success(result.message || 'Avatar uploaded successfully');
      } else {
        toast.error(result.message || 'Failed to upload avatar');
      }
    } catch (error) {
      toast.error('An error occurred while uploading avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-1">{t.title}</h3>
        <p className="text-gray-600 text-sm">{t.subtitle}</p>
      </div>

      {/* Avatar Section */}
      <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-200">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center overflow-hidden">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-white" />
            )}
          </div>
          {isUploadingAvatar && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-1">{profile.name}</h4>
          <p className="text-gray-600 text-sm mb-3">{profile.email}</p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all cursor-pointer text-sm">
            <Camera className="w-4 h-4" />
            <span>{t.uploadPhoto}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={isUploadingAvatar}
            />
          </label>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.fullName}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={isEditing ? formData.name : profile.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!isEditing}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.email}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.phone}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={isEditing ? formData.phone : profile.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={!isEditing}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.dateOfBirth}</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={isEditing ? formData.dateOfBirth : profile.dateOfBirth || ''}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                disabled={!isEditing}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.gender}</label>
            <select
              value={isEditing ? formData.gender : profile.gender || 'male'}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              disabled={!isEditing}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="male">{t.male}</option>
              <option value="female">{t.female}</option>
              <option value="other">{t.other}</option>
            </select>
          </div>

          {/* Nationality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.nationality}</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={isEditing ? formData.nationality : profile.nationality || ''}
                onChange={(e) => handleInputChange('nationality', e.target.value)}
                disabled={!isEditing}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.address}</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={isEditing ? formData.address : profile.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                disabled={!isEditing}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.city}</label>
            <input
              type="text"
              value={isEditing ? formData.city : profile.city || ''}
              onChange={(e) => handleInputChange('city', e.target.value)}
              disabled={!isEditing}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.country}</label>
            <input
              type="text"
              value={isEditing ? formData.country : profile.country || ''}
              onChange={(e) => handleInputChange('country', e.target.value)}
              disabled={!isEditing}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? t.saving : t.saveChanges}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all"
            >
              {language === 'vi' ? 'Chỉnh Sửa' : 'Edit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}