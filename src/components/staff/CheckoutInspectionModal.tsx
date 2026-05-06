import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Banknote, ClipboardCheck, DollarSign, House, X } from 'lucide-react';
import type { Booking } from '../../types/booking.types';

interface CheckoutInspectionPayload {
  note: string;
  extraChargeAmount: number;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER';
}

interface CheckoutInspectionModalProps {
  open: boolean;
  booking: Booking | null;
  onClose: () => void;
  onConfirm: (payload: CheckoutInspectionPayload) => Promise<void> | void;
  submitting?: boolean;
}

const defaultNote = 'Phòng đã kiểm tra, không phát sinh hư hại.';

export function CheckoutInspectionModal({
  open,
  booking,
  onClose,
  onConfirm,
  submitting = false,
}: CheckoutInspectionModalProps) {
  const [note, setNote] = useState(defaultNote);
  const [extraChargeAmount, setExtraChargeAmount] = useState('0');

  useEffect(() => {
    if (!open) return;
    setNote(defaultNote);
    setExtraChargeAmount('0');
  }, [open, booking?.id]);

  const amountValue = useMemo(() => {
    const parsed = Number(extraChargeAmount);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [extraChargeAmount]);

  // Calculate remaining amount (including extra charges)
  const remainingAmount = useMemo(() => {
    if (!booking) return 0;
    const remaining = booking.remainingAmount || 0;
    return remaining + amountValue;
  }, [booking, amountValue]);

  const hasUnpaidAmount = remainingAmount > 0;

  if (!open || !booking) return null;

  const handleSubmit = () => {
    const trimmedNote = note.trim();
    if (!trimmedNote) {
      return;
    }

    void onConfirm({
      note: trimmedNote,
      extraChargeAmount: amountValue,
      paymentMethod: 'CASH',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)] my-1 sm:my-3 overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50">
          <div>
            <div className="flex items-center gap-2 text-cyan-700 font-semibold mb-2">
              <ClipboardCheck className="w-5 h-5" />
              Kiểm tra phòng trước khi checkout
            </div>
            <h3 className="text-xl font-bold text-gray-900">{booking.homestayName}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Khách: {booking.customerName} · Check-out: {new Date(booking.checkOutDate).toLocaleDateString('vi-VN')}
            </p>
          </div>
          <button onClick={onClose} type="button" className="p-2 rounded-lg hover:bg-white/80 transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Payment Warning */}
          {hasUnpaidAmount && (
            <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-1">Khách còn nợ phí phát sinh!</h4>
                  <p className="text-sm text-red-800 mb-3">
                    Tổng cần thu: <span className="font-bold">{remainingAmount.toLocaleString('vi-VN')} VND</span>
                  </p>
                  <p className="text-xs text-red-700">
                    Vui lòng thu tiền từ khách (tiền mặt hoặc chuyển khoản), sau đó chọn phương thức bên dưới và xác nhận.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Thông tin phòng</p>
              <div className="flex items-center gap-2 text-gray-900 font-medium">
                <House className="w-4 h-4 text-cyan-600" />
                {booking.homestayName}
              </div>
              <p className="text-sm text-gray-600 mt-2">Mã booking: {booking.bookingCode}</p>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Phát sinh hiện tại</p>
              <div className="flex items-center gap-2 text-gray-900 font-medium">
                <Banknote className="w-4 h-4 text-green-600" />
                {amountValue.toLocaleString('vi-VN')} VND
              </div>
              <p className="text-sm text-gray-600 mt-2">Nhập 0 nếu không có phí phát sinh.</p>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Tổng kết thanh toán</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-800">Nợ hiện tại:</span>
                <span className="font-medium text-blue-900">
                  {(booking.remainingAmount || 0).toLocaleString('vi-VN')} VND
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-800">Phí phát sinh:</span>
                <span className="font-medium text-blue-900">
                  {amountValue.toLocaleString('vi-VN')} VND
                </span>
              </div>
              <div className="border-t border-blue-300 pt-2 flex justify-between">
                <span className="font-semibold text-blue-900">Tổng cần thu:</span>
                <span className="font-bold text-blue-900 text-lg">
                  {remainingAmount.toLocaleString('vi-VN')} VND
                </span>
              </div>
            </div>
          </div>



          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú kiểm phòng</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Ví dụ: Kiểm tra giường, điều hòa, TV; phát hiện nứt kính bàn..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tiền phát sinh</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={extraChargeAmount}
              onChange={(e) => setExtraChargeAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
            <strong>Lưu ý:</strong> Ghi chú này sẽ được lưu cùng phí phát sinh. Nếu có hư hại hoặc thất lạc tài sản, vui lòng mô tả chi tiết để làm căn cứ tính phí.
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end bg-gray-50">
          <button
            onClick={onClose}
            type="button"
            className="px-5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            disabled={submitting}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            type="button"
            className="px-5 py-2.5 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={submitting || !note.trim()}
          >
            {submitting
              ? 'Đang xử lý...'
              : hasUnpaidAmount
                ? 'Xác nhận đã thu tiền & Checkout'
                : 'Xác nhận kiểm phòng & Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}