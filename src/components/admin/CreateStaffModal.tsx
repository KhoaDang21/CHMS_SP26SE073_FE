import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { employeeService } from '../../services/employeeService';
import type { Staff, StaffStatus } from '../../types/staff.types';

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
}

const initialState: StaffFormState = {
  username: '',
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  avatarUrl: '',
  status: 'active',
};

export function CreateStaffModal({ isOpen, onClose, onSuccess, editingStaff }: CreateStaffModalProps) {
  const [form, setForm] = useState<StaffFormState>(initialState);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (editingStaff) {
      setForm({
        username: editingStaff.email?.split('@')[0] || '',
        fullName: editingStaff.name || '',
        email: editingStaff.email || '',
        phoneNumber: editingStaff.phone || '',
        password: '',
        avatarUrl: editingStaff.avatar || '',
        status: editingStaff.status || 'active',
      });
      return;
    }

    setForm(initialState);
  }, [isOpen, editingStaff]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.username.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    if (!editingStaff && !form.password.trim()) {
      toast.error('Vui lòng nhập mật khẩu cho nhân viên mới');
      return;
    }

    setSubmitting(true);
    try {
      if (editingStaff) {
        const updatePayload: any = {
          username: form.username,
          fullName: form.fullName,
          email: form.email,
          phoneNumber: form.phoneNumber,
          avatarUrl: form.avatarUrl || undefined,
        };

        if (form.password.trim()) {
          updatePayload.password = form.password;
        }

        const updateRes = await employeeService.updateEmployee(editingStaff.id, updatePayload);
        if (!updateRes?.success) {
          toast.error(updateRes?.message || 'Không thể cập nhật nhân viên');
          return;
        }

        const statusRes = await employeeService.updateEmployeeStatus(editingStaff.id, { status: form.status });
        if (statusRes?.success === false) {
          toast.error(statusRes.message || 'Không thể cập nhật trạng thái nhân viên');
          return;
        }

        toast.success('Cập nhật nhân viên thành công');
      } else {
        const createRes = await employeeService.createEmployee({
          username: form.username,
          fullName: form.fullName,
          email: form.email,
          phoneNumber: form.phoneNumber,
          password: form.password,
          avatarUrl: form.avatarUrl || undefined,
        });

        if (!createRes?.success) {
          toast.error(createRes?.message || 'Không thể tạo nhân viên');
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Avatar URL</label>
              <input
                value={form.avatarUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
