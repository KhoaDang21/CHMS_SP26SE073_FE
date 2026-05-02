import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { facilityService } from '../../services/facilityService';
import { FACILITY_CONDITION_OPTIONS, type FacilityAsset, type CreateFacilityPayload } from '../../types/facility.types';

const commonFacilitySuggestions = [
  { name: 'Giường đôi', category: 'FURNITURE' },
  { name: 'Giường đơn', category: 'FURNITURE' },
  { name: 'Nệm', category: 'FURNITURE' },
  { name: 'Tủ quần áo', category: 'FURNITURE' },
  { name: 'Bàn ghế', category: 'FURNITURE' },
  { name: 'Điều hòa', category: 'ELECTRIC' },
  { name: 'Quạt', category: 'ELECTRIC' },
  { name: 'TV', category: 'ELECTRIC' },
  { name: 'Tủ lạnh', category: 'ELECTRIC' },
  { name: 'Ấm siêu tốc', category: 'ELECTRIC' },
  { name: 'Máy sấy tóc', category: 'ELECTRIC' },
  { name: 'Bình nóng lạnh', category: 'ELECTRIC' },
  { name: 'Khăn tắm', category: 'CONSUMABLE' },
  { name: 'Khăn mặt', category: 'CONSUMABLE' },
  { name: 'Nước suối', category: 'CONSUMABLE' },
  { name: 'Bánh snack', category: 'CONSUMABLE' },
  { name: 'Mì gói', category: 'CONSUMABLE' },
  { name: 'Bàn chải đánh răng', category: 'CONSUMABLE' },
  { name: 'Dép đi trong nhà', category: 'CONSUMABLE' },
  { name: 'Dụng cụ nấu ăn', category: 'KITCHEN' },
];

interface ManagerHomestayFacilitiesTabProps {
  homestayId: string;
}

export default function ManagerHomestayFacilitiesTab({ homestayId }: ManagerHomestayFacilitiesTabProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FacilityAsset[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FacilityAsset | null>(null);
  const [form, setForm] = useState<CreateFacilityPayload>({ homestayId, name: '' });

  useEffect(() => {
    if (!homestayId) return;
    loadFacilities();
  }, [homestayId]);

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const list = await facilityService.managerGetFacilities(homestayId);
      setItems(list);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách tài sản');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ homestayId, name: '', conditionStatus: 'GOOD' });
    setShowModal(true);
  };

  const applySuggestion = (suggestion: { name: string; category: string }) => {
    setForm((current) => ({
      ...current,
      homestayId,
      name: suggestion.name,
      category: suggestion.category,
      quantity: current.quantity ?? 1,
      conditionStatus: current.conditionStatus ?? 'GOOD',
      isActive: current.isActive ?? true,
    }));
  };

  const openEdit = (item: FacilityAsset) => {
    setEditing(item);
    setForm({
      homestayId: item.homestayId,
      name: item.name,
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      conditionStatus: item.conditionStatus,
      purchaseDate: item.purchaseDate,
      lastMaintenanceDate: item.lastMaintenanceDate,
      replacementCost: item.replacementCost,
      imageUrl: item.imageUrl,
      isActive: item.isActive,
    } as any);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài sản này?')) return;
    try {
      await facilityService.managerDeleteFacility(id);
      setItems((s) => s.filter((i) => i.id !== id));
      toast.success('Xóa tài sản thành công');
    } catch (err) {
      console.error(err);
      toast.error('Không thể xóa tài sản');
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.homestayId) return toast.error('Vui lòng nhập tên tài sản');
    try {
      if (editing) {
        const updated = await facilityService.managerUpdateFacility(editing.id, form as any);
        if (updated) setItems((s) => s.map((it) => (it.id === updated.id ? updated : it)));
        toast.success('Cập nhật tài sản thành công');
      } else {
        const created = await facilityService.managerCreateFacility(form as any);
        if (created) setItems((s) => [created, ...s]);
        toast.success('Tạo tài sản mới thành công');
      }
      setShowModal(false);
      await loadFacilities();
    } catch (err) {
      console.error(err);
      toast.error('Không thể lưu tài sản');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-600 mt-4">Đang tải danh sách tài sản...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Quản lý Tài sản & Hàng tiêu hao</h2>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          <Plus className="w-4 h-4" /> Thêm tài sản
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-md">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Chưa có tài sản nào được tạo</p>
          <p className="text-gray-500 text-sm">Bấm "Thêm tài sản" để bắt đầu quản lý</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-gray-900 flex-1">{item.name}</h3>
                {!item.isActive && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                    Ngưng hoạt động
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 mb-3">
                <p>{item.category}</p>
              </div>
              {item.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-gray-600 text-xs">Số lượng:</span>
                  <p className="font-semibold text-base">{item.quantity ?? 0}</p>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-gray-600 text-xs">Tình trạng:</span>
                  <p className="font-semibold text-xs">{item.conditionStatus || 'N/A'}</p>
                </div>
                {item.replacementCost && (
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-gray-600 text-xs">Giá thay thế:</span>
                    <p className="font-semibold text-base">{item.replacementCost.toLocaleString()} ₫</p>
                  </div>
                )}
                {item.purchaseDate && (
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-gray-600 text-xs">Ngày mua:</span>
                    <p className="font-semibold text-xs">{new Date(item.purchaseDate).toLocaleDateString('vi-VN')}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(item)}
                  className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition text-sm font-medium flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-4 h-4" /> Sửa
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition text-sm font-medium flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Chỉnh sửa tài sản' : 'Thêm tài sản mới'}</h2>
            <div className="mb-5 rounded-xl border border-cyan-100 bg-cyan-50 p-4">
              <div className="mb-2 text-sm font-semibold text-cyan-900">Gợi ý facility phổ biến</div>
              <div className="flex flex-wrap gap-2">
                {commonFacilitySuggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.category}-${suggestion.name}`}
                    type="button"
                    onClick={() => applySuggestion(suggestion)}
                    className="rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-xs font-medium text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-100"
                  >
                    {suggestion.name}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-cyan-700">
                Bấm một mục để điền nhanh tên và loại tài sản.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Tên tài sản *</label>
                <input
                  value={(form as any).name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nhập tên tài sản"
                  className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Loại tài sản</label>
                <input
                  value={(form as any).category || ''}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="VD: Đồ dùng, Thiết bị"
                  className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Số lượng</label>
                <input
                  type="number"
                  value={(form as any).quantity ?? 0}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tình trạng</label>
                <select
                  value={(form as any).conditionStatus || 'GOOD'}
                  onChange={(e) => setForm({ ...form, conditionStatus: e.target.value as any })}
                  className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FACILITY_CONDITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Ngày mua</label>
                <input
                  type="date"
                  value={(form as any).purchaseDate || ''}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Giá thay thế (VNĐ)</label>
                <input
                  type="number"
                  value={(form as any).replacementCost ?? 0}
                  onChange={(e) => setForm({ ...form, replacementCost: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Mô tả chi tiết</label>
                <textarea
                  value={(form as any).description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Nhập mô tả về tài sản"
                  className="w-full border border-gray-300 rounded px-3 py-2 mt-1 h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Link ảnh</label>
                <input
                  value={(form as any).imageUrl || ''}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Hoạt động?</label>
                <select
                  value={(form as any).isActive ? 'yes' : 'no'}
                  onChange={(e) => setForm({ ...form, isActive: e.target.value === 'yes' })}
                  className="w-full border border-gray-300 rounded px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="yes">Có</option>
                  <option value="no">Không</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-100 text-gray-700 rounded hover:bg-slate-200 transition font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
              >
                {editing ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
