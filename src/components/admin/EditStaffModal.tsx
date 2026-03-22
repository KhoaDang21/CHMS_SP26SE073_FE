import { useEffect, useState, type ChangeEvent } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { employeeService } from '../../services/employeeService';
import type { Staff, StaffStatus } from '../../types/staff.types';

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staff: Staff | null;
}

interface EditStaffFormState {
  fullName: string;
  phoneNumber: string;
  avatarUrl: string;
  status: StaffStatus;
}

const initialState: EditStaffFormState = {
  fullName: '',
  phoneNumber: '',
  avatarUrl: '',
  status: 'active',
};

export function EditStaffModal({ isOpen, onClose, onSuccess, staff }: EditStaffModalProps) {
  const [form, setForm] = useState<EditStaffFormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (!isOpen || !staff) return;

    setForm({
      fullName: staff.name || '',
      phoneNumber: staff.phone || '',
      avatarUrl: staff.avatar || '',
      status: staff.status || 'active',
    });
    setSelectedAvatarFile(null);
    setAvatarPreview(staff.avatar || '');
  }, [isOpen, staff]);

  useEffect(() => {
    if (!selectedAvatarFile) return;

    const previewUrl = URL.createObjectURL(selectedAvatarFile);
    setAvatarPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [selectedAvatarFile]);

  if (!isOpen || !staff) return null;

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedAvatarFile(file);
    setForm((prev) => ({ ...prev, avatarUrl: '' }));
  };

  const clearAvatarFile = () => {
    setSelectedAvatarFile(null);
    setAvatarPreview(form.avatarUrl || staff.avatar || '');
  };

  const handleSubmit = async () => {
    if (!form.fullName.trim()) {
      toast.error('Vui lòng nhập họ và tên');
      return;
    }

    setSubmitting(true);
    try {
      const updateRes = await employeeService.updateEmployee(staff.id, {
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        avatarUrl: form.avatarUrl.trim() || undefined,
      });

      if (!updateRes?.success) {
        toast.error(updateRes?.message || 'Không thể cập nhật nhân viên');
        return;
      }

      const statusRes = await employeeService.updateEmployeeStatus(staff.id, { status: form.status });
      if (statusRes?.success === false) {
        toast.warning(statusRes.message || 'Đã cập nhật thông tin, nhưng chưa cập nhật được trạng thái');
      }

      if (selectedAvatarFile) {
        const avatarRes = await employeeService.uploadAvatar(staff.id, selectedAvatarFile);
        if (!avatarRes?.success) {
          toast.warning(avatarRes?.message || 'Đã cập nhật thông tin, nhưng upload avatar thất bại');
        }
      }

      toast.success('Cập nhật nhân viên thành công');
      onSuccess();
    } catch (error) {
      console.error('Update staff error:', error);
      toast.error('Đã xảy ra lỗi khi cập nhật nhân viên');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Chỉnh sửa nhân viên</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Username</label>
              <input
                value={staff.email?.split('@')[0] || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Không hỗ trợ cập nhật username ở API hiện tại.</p>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Họ và tên *</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={staff.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Không hỗ trợ cập nhật email ở API hiện tại.</p>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Số điện thoại</label>
              <input
                value={form.phoneNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Vai trò</label>
              <input
                value={staff.role === 'admin' ? 'Quản trị viên' : staff.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Không hỗ trợ cập nhật vai trò ở API hiện tại.</p>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Trạng thái</label>
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as StaffStatus }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Đang làm việc</option>
                <option value="on_leave">Nghỉ phép</option>
                <option value="inactive">Ngừng làm việc</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Avatar URL</label>
              <input
                value={form.avatarUrl}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({ ...prev, avatarUrl: value }));
                  if (value.trim()) {
                    setSelectedAvatarFile(null);
                    setAvatarPreview(value.trim());
                  } else if (!selectedAvatarFile) {
                    setAvatarPreview(staff.avatar || '');
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              {(selectedAvatarFile || avatarPreview) && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="h-14 w-14 rounded-full object-cover border border-gray-200"
                  />
                  {selectedAvatarFile && (
                    <button
                      type="button"
                      onClick={clearAvatarFile}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Bỏ ảnh đã chọn
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Đang lưu...' : 'Cập nhật'}
          </button>
        </div>
      </div>
    </div>
  );
}
