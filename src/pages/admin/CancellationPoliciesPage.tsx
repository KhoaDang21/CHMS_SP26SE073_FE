import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, X, LogOut, Building2,
  Plus, Pencil, Trash2, Loader2,
  ShieldCheck, CheckCircle2, XCircle, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/authService';
import { RoleBadge } from '../../components/common/RoleBadge';
import { adminNavItems } from '../../config/adminNavItems';
import {
  cancellationPolicyService,
  type CancellationPolicy,
  type UpsertPolicyRequest,
} from '../../services/cancellationPolicyService';

const emptyForm = (): UpsertPolicyRequest => ({
  daysBefore: 7,
  refundPercentage: 100,
  isActive: true,
});

export default function CancellationPoliciesPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [policies, setPolicies] = useState<CancellationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CancellationPolicy | null>(null);
  const [form, setForm] = useState<UpsertPolicyRequest>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const user = authService.getCurrentUser();

  const load = async () => {
    setLoading(true);
    try {
      const data = await cancellationPolicyService.getAll();
      setPolicies(data.sort((a, b) => b.daysBefore - a.daysBefore));
    } catch {
      toast.error('Không thể tải chính sách hoàn tiền');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (p: CancellationPolicy) => {
    setEditing(p);
    setForm({ daysBefore: p.daysBefore, refundPercentage: p.refundPercentage, isActive: p.isActive });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (form.daysBefore < 0 || form.refundPercentage < 0 || form.refundPercentage > 100) {
      toast.error('Dữ liệu không hợp lệ');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await cancellationPolicyService.update(editing.id, form);
        toast.success('Cập nhật chính sách thành công');
      } else {
        await cancellationPolicyService.create(form);
        toast.success('Tạo chính sách thành công');
      }
      setShowModal(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa chính sách này?')) return;
    setDeletingId(id);
    try {
      await cancellationPolicyService.delete(id);
      toast.success('Đã xóa chính sách');
      await load();
    } catch {
      toast.error('Không thể xóa chính sách');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => { authService.logout(); navigate('/auth/login'); };

  const activeCount = policies.filter((p) => p.isActive).length;
  const inactiveCount = policies.length - activeCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-white shadow-lg w-64`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-900">CHMS Admin</h1>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] pb-32">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'cancellation-policies';
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full min-w-0 flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="min-w-0 flex-1 text-left truncate" title={item.label}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.name ?? 'Admin'}</p>
              <div className="mt-1">{user?.role && <RoleBadge role={user.role} size="sm" />}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={`transition-all ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Chính sách hoàn tiền</h2>
                <p className="text-gray-600 text-sm">Quản lý quy tắc hoàn tiền khi khách hủy booking</p>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Thêm chính sách</span>
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Tổng chính sách</p>
                  <p className="text-3xl font-bold text-gray-900">{policies.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Đang áp dụng</p>
                  <p className="text-3xl font-bold text-gray-900">{activeCount}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-gray-400">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Tạm tắt</p>
                  <p className="text-3xl font-bold text-gray-900">{inactiveCount}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-gray-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Hệ thống áp dụng chính sách có <strong>số ngày trước check-in cao nhất</strong> phù hợp với thời điểm hủy.
              Nếu không có chính sách nào khớp, khách sẽ <strong>không được hoàn tiền</strong>.
              Khách hủy trong vòng 30 phút sau khi đặt sẽ được hoàn 100% bất kể chính sách.
            </p>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-3 text-gray-500">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p>Đang tải chính sách...</p>
              </div>
            ) : policies.length === 0 ? (
              <div className="py-20 text-center">
                <ShieldCheck className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Chưa có chính sách nào</p>
                <p className="text-gray-400 text-sm mt-1">Thêm chính sách đầu tiên để bắt đầu</p>
                <button
                  onClick={openCreate}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Thêm chính sách
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold text-gray-600">Điều kiện hủy</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-600">% Hoàn tiền</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-600">Mô tả</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-600">Trạng thái</th>
                      <th className="px-6 py-4 text-right font-semibold text-gray-600">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {policies.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">
                            {p.daysBefore === 0
                              ? 'Bất kỳ lúc nào'
                              : p.refundPercentage === 0
                              ? `Hủy trong vòng ${p.daysBefore} ngày`
                              : `Hủy trước ≥ ${p.daysBefore} ngày`}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {p.daysBefore === 0
                              ? 'Áp dụng khi không có chính sách nào khớp'
                              : p.refundPercentage === 0
                              ? `Khách hủy trong vòng ${p.daysBefore} ngày trước check-in`
                              : `Khách hủy ít nhất ${p.daysBefore} ngày trước check-in`}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${
                            p.refundPercentage === 100
                              ? 'bg-green-100 text-green-700'
                              : p.refundPercentage === 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {p.refundPercentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {p.refundPercentage === 100
                            ? 'Hoàn toàn bộ tiền đã thanh toán'
                            : p.refundPercentage === 0
                            ? 'Không hoàn tiền'
                            : `Hoàn ${p.refundPercentage}% tổng tiền booking`}
                        </td>
                        <td className="px-6 py-4">
                          {p.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Đang áp dụng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              Tạm tắt
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
                            >
                              <Pencil className="w-4 h-4" />
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              disabled={deletingId === p.id}
                              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              {deletingId === p.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Trash2 className="w-4 h-4" />}
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Modal thêm/sửa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h2 className="text-xl font-bold">{editing ? 'Chỉnh sửa chính sách' : 'Thêm chính sách mới'}</h2>
                <p className="text-blue-100 text-sm mt-0.5">Thiết lập quy tắc hoàn tiền khi hủy booking</p>
              </div>
              <button
                onClick={() => { if (!saving) setShowModal(false); }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hủy trước bao nhiêu ngày check-in
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.daysBefore}
                  onChange={(e) => setForm((f) => ({ ...f, daysBefore: Number(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: 7"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Nhập <strong>0</strong> để áp dụng cho mọi trường hợp hủy (fallback cuối cùng)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phần trăm hoàn tiền (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.refundPercentage}
                  onChange={(e) => setForm((f) => ({ ...f, refundPercentage: Number(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0 - 100"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  <strong>100%</strong> = hoàn toàn bộ · <strong>0%</strong> = không hoàn tiền
                </p>
              </div>

              {/* Preview */}
              {form.daysBefore >= 0 && (
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">
                  <p className="font-semibold mb-1">Xem trước quy tắc:</p>
                  <p>
                    {form.refundPercentage === 0 ? (
                      <>
                        Khách hủy{' '}
                        {form.daysBefore === 0
                          ? 'bất kỳ lúc nào'
                          : `trong vòng ${form.daysBefore} ngày trước check-in`}
                        {' '}→{' '}
                        <span className="font-bold text-red-700">không hoàn tiền</span>.
                      </>
                    ) : (
                      <>
                        Khách hủy{' '}
                        {form.daysBefore === 0
                          ? 'bất kỳ lúc nào'
                          : `trước ít nhất ${form.daysBefore} ngày check-in`}
                        {' '}→ hoàn{' '}
                        <span className={`font-bold ${form.refundPercentage === 100 ? 'text-green-700' : 'text-yellow-700'}`}>
                          {form.refundPercentage}%
                        </span>{' '}
                        tổng tiền booking.
                      </>
                    )}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Kích hoạt chính sách này ngay
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors font-medium disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Lưu thay đổi' : 'Tạo chính sách'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
