import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import type { SeasonalPricing, SeasonalPricingCreateRequest } from '../../types/pricing.types';

interface SeasonalPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SeasonalPricingCreateRequest) => Promise<void> | void;
  loading?: boolean;
  initialData?: SeasonalPricing | null;
  homestayName?: string;
}

const today = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDateInputValue = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function SeasonalPricingModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  initialData = null,
  homestayName,
}: SeasonalPricingModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  const isEditing = Boolean(initialData?.id);

  useEffect(() => {
    if (!isOpen) return;

    setStartDate(toDateInputValue(initialData?.startDate));
    setEndDate(toDateInputValue(initialData?.endDate));
    setName(initialData?.name ?? initialData?.description ?? '');
    setPrice(String(initialData?.price ?? initialData?.pricePerNight ?? ''));
    setError('');
  }, [initialData, isOpen]);

  const canSubmit = useMemo(() => {
    const parsedPrice = Number(price);
    return Boolean(
      startDate.trim() &&
        endDate.trim() &&
        name.trim() &&
        parsedPrice > 0 &&
        !loading,
    );
  }, [endDate, loading, name, price, startDate]);

  const handleSubmit = async () => {
    setError('');

    if (!startDate || !endDate) {
      setError('Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.');
      return;
    }

    if (!name.trim()) {
      setError('Vui lòng nhập tên cấu hình giá theo mùa.');
      return;
    }

    const parsedStart = new Date(`${startDate}T00:00:00`);
    const parsedEnd = new Date(`${endDate}T00:00:00`);
    const parsedPrice = Number(price);

    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      setError('Ngày không hợp lệ.');
      return;
    }

    if (parsedStart < today()) {
      setError('Không thể tạo giá theo mùa cho ngày trong quá khứ.');
      return;
    }

    if (parsedEnd < parsedStart) {
      setError('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
      return;
    }

    if (!(parsedPrice > 0)) {
      setError('Giá theo mùa phải lớn hơn 0.');
      return;
    }

    await onSubmit({
      name: name.trim(),
      startDate,
      endDate,
      price: parsedPrice,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Cập nhật giá theo mùa' : 'Thêm giá theo mùa'}
          </DialogTitle>
          <DialogDescription>
            {homestayName
              ? `Thiết lập mức giá cho ${homestayName}.`
              : 'Thiết lập mức giá cho homestay trong một khoảng thời gian cụ thể.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tên cấu hình *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ví dụ: "Lễ 30/4 - 1/5"'
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ngày bắt đầu *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ngày kết thúc *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Giá / đêm *</label>
            <input
              type="number"
              min={1}
              step="1000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ví dụ: 850000"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
