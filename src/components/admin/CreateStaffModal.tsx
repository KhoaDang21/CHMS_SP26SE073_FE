import { useEffect, useState, type ChangeEvent } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { employeeService } from '../../services/employeeService';
import type { Staff, StaffStatus } from '../../types/staff.types';
import { roleService } from '../../services/roleService';
import type { Role } from '../../types/role.types';

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingStaff?: Staff | null;
}

interface StaffFormState {
  username: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  avatarUrl: string;
  status: StaffStatus;
  roleId: string;
}

const initialState: StaffFormState = {
  username: '',
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  avatarUrl: '',
  status: 'active',
  roleId: '',
};

export function CreateStaffModal({ isOpen, onClose, onSuccess, editingStaff }: CreateStaffModalProps) {
  const [form, setForm] = useState<StaffFormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    const loadRoles = async () => {
      const roles = await roleService.getRoles();
      const filtered = roles.filter((role) => {
        const name = (role.name || '').toLowerCase();
        return name === 'manager' || name === 'staff';
      });

      setAvailableRoles(filtered);
    };

    loadRoles();
  }, [isOpen, editingStaff]);

  useEffect(() => {
    if (!isOpen) return;

    if (editingStaff) {
      const matchedRole = availableRoles.find(
        (role) => (role.name || '').toLowerCase() === (editingStaff.role || '').toLowerCase(),
      );

      setForm({
        username: editingStaff.email?.split('@')[0] || '',
        fullName: editingStaff.name || '',
        email: editingStaff.email || '',
        phoneNumber: editingStaff.phone || '',
        password: '',
        avatarUrl: editingStaff.avatar || '',
        status: editingStaff.status || 'active',
        roleId: matchedRole?.id || '',
      });
      setSelectedAvatarFile(null);
      setAvatarPreview(editingStaff.avatar || '');
      return;
    }

    setForm((prev) => ({ ...initialState, roleId: prev.roleId }));
    setSelectedAvatarFile(null);
    setAvatarPreview('');
  }, [isOpen, editingStaff, availableRoles]);

  useEffect(() => {
    if (!selectedAvatarFile) return;

    const previewUrl = URL.createObjectURL(selectedAvatarFile);
    setAvatarPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [selectedAvatarFile]);

  if (!isOpen) return null;

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedAvatarFile(file);
    setForm((prev) => ({ ...prev, avatarUrl: '' }));
  };

  const clearAvatarFile = () => {
    setSelectedAvatarFile(null);
    setAvatarPreview(form.avatarUrl || '');
  };

  const handleSubmit = async () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.username.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    if (!editingStaff && !form.password.trim()) {
      toast.error('Vui lòng nhập mật khẩu cho nhân viên mới');
      return;
    }

    if (!editingStaff && !form.roleId) {
      toast.error('Vui lòng chọn vai trò (Manager hoặc Staff)');
      return;
    }

    setSubmitting(true);
    try {
      if (editingStaff) {
        const updatePayload = {
          fullName: form.fullName,
          phoneNumber: form.phoneNumber,
          avatarUrl: form.avatarUrl || undefined,
        };

        const updateRes = await employeeService.updateEmployee(editingStaff.id, updatePayload);
        if (!updateRes?.success) {
          toast.error(updateRes?.message || 'Không thể cập nhật nhân viên');
          return;
        }

        const statusRes = await employeeService.updateEmployeeStatus(editingStaff.id, { status: form.status });
        if (statusRes?.success === false) {
          toast.warning(statusRes.message || 'Đã cập nhật thông tin, nhưng chưa cập nhật được trạng thái nhân viên');
        }

        toast.success('Cập nhật nhân viên thành công');
      } else {
        const createPayload = {
          username: form.username,
          fullName: form.fullName,
          email: form.email,
          phoneNumber: form.phoneNumber,
          password: form.password,
          avatarUrl: form.avatarUrl || undefined,
          roleId: form.roleId,
        };

        const createRes = selectedAvatarFile
          ? await employeeService.createEmployeeWithAvatarFile(createPayload, selectedAvatarFile)
          : await employeeService.createEmployee(createPayload);

        if (!createRes?.success) {
          toast.error(createRes?.message || 'Không thể tạo nhân viên. Nếu backend chưa hỗ trợ upload file, hãy nhập Avatar URL.');
          return;
        }

        toast.success('Tạo nhân viên thành công');
      }

      onSuccess();
    } catch (error) {
      console.error('Submit staff error:', error);
      toast.error('Đã xảy ra lỗi khi lưu nhân viên');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">
            {editingStaff ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Username *</label>
              <input
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                disabled={!!editingStaff}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {editingStaff && (
                <p className="text-xs text-gray-500 mt-1">Username không hỗ trợ cập nhật ở API hiện tại.</p>
              )}
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
              <label className="block text-sm text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                disabled={!!editingStaff}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {editingStaff && (
                <p className="text-xs text-gray-500 mt-1">Email không hỗ trợ cập nhật ở API hiện tại.</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Vai trò *</label>
              <select
                value={form.roleId}
                onChange={(e) => setForm((prev) => ({ ...prev, roleId: e.target.value }))}
                disabled={!!editingStaff}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>
                  Chọn vai trò
                </option>
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              {availableRoles.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Không tải được role Manager/Staff từ API roles. Vui lòng kiểm tra dữ liệu role.
                </p>
              )}
              {editingStaff && (
                <p className="text-xs text-gray-500 mt-1">Vai trò chỉ đổi được qua API/chức năng phân quyền riêng.</p>
              )}
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
              <label className="block text-sm text-gray-700 mb-1">
                {editingStaff ? 'Mật khẩu mới (không bắt buộc)' : 'Mật khẩu *'}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                disabled={!!editingStaff}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {editingStaff && (
                <p className="text-xs text-gray-500 mt-1">API cập nhật hiện tại chưa hỗ trợ đổi mật khẩu ở form này.</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Avatar URL (hoặc chọn ảnh từ máy)</label>
              <input
                value={form.avatarUrl}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, avatarUrl: e.target.value }));
                  if (e.target.value.trim()) {
                    setSelectedAvatarFile(null);
                    setAvatarPreview(e.target.value.trim());
                  } else if (!selectedAvatarFile) {
                    setAvatarPreview('');
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
                    src={avatarPreview || form.avatarUrl}
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

          {editingStaff && (
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
          )}
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
            {submitting ? 'Đang lưu...' : editingStaff ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </div>
    </div>
  );
}
