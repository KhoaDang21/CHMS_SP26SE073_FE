import { useState } from 'react';
import { X } from 'lucide-react';
import type { CheckInCallStatus } from '../../types/booking.types';

interface CheckInCallModalProps {
  bookingId: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  onClose: () => void;
  onSubmit: (status: CheckInCallStatus, note?: string) => Promise<void>;
}

export function CheckInCallModal({
  bookingCode,
  customerName,
  customerPhone,
  onClose,
  onSubmit,
}: CheckInCallModalProps) {
  const [status, setStatus] = useState<CheckInCallStatus>('CUSTOMER_COMING');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(status, note.trim() || undefined);
      // Chỉ đóng modal khi thành công
      onClose();
    } catch (error) {
      console.error('Error submitting check-in call:', error);
      // Không đóng modal — để user thấy lỗi từ toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold">Ghi nhận cuộc gọi nhắc check-in</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100"
            disabled={submitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="rounded-lg bg-blue-50 p-3 text-sm">
            <p className="font-medium text-blue-900">Booking: {bookingCode}</p>
            <p className="text-blue-700">Khách: {customerName}</p>
            <p className="text-blue-700">SĐT: {customerPhone}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kết quả cuộc gọi <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CheckInCallStatus)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            >
              <option value="CUSTOMER_COMING">✅ Khách xác nhận sẽ đến</option>
              <option value="NO_ANSWER">🔇 Không nghe máy</option>
              <option value="CANCELLED">🚫 Khách xác nhận hủy</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ghi chú
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú về cuộc gọi (tùy chọn)..."
              rows={3}
              maxLength={1000}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              {note.length}/1000 ký tự
            </p>
          </div>

          {status === 'CANCELLED' && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Nếu khách xác nhận hủy, booking sẽ được chuyển sang trạng thái CANCELLED và xử lý hoàn tiền theo chính sách.
              </p>
            </div>
          )}
          {status === 'NO_ANSWER' && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm text-blue-800">
                📋 Booking vẫn giữ nguyên trạng thái CONFIRMED. Có thể gọi lại sau.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Đang lưu...' : 'Xác nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
