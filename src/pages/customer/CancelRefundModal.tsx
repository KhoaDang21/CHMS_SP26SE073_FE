import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, X, BadgePercent, Info, CreditCard } from 'lucide-react';
import { bookingService } from '../../services/bookingService';

interface Props {
  bookingId: string;
  homestayName: string;
  totalPrice: number;
  onClose: () => void;
  onSuccess: (refundAmount: number, message: string) => void;
}

export default function CancelRefundModal({ bookingId, homestayName, totalPrice, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [preview, setPreview] = useState<{ estimatedRefund: number; message: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const BANKS = [
    'Vietcombank', 'VietinBank', 'BIDV', 'Agribank', 'Techcombank',
    'MB Bank', 'ACB', 'VPBank', 'TPBank', 'Sacombank',
    'HDBank', 'OCB', 'SHB', 'SeABank', 'VIB', 'MSB', 'Eximbank',
  ];

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    bookingService.previewRefund(bookingId).then((res) => {
      if (!cancelled) { setPreview(res); setPreviewLoading(false); }
    });
    return () => { cancelled = true; };
  }, [bookingId]);

  const hasRefund = preview && preview.estimatedRefund > 0;

  const isValid =
    reason.trim() &&
    (hasRefund
      ? bankName.trim() && accountNumber.trim() && accountHolderName.trim()
      : true);

  const handleConfirm = async () => {
    if (!isValid) return;
    setSubmitting(true);
    const res = await bookingService.cancelAndRefund(bookingId, reason.trim(), {
      bankName: hasRefund ? bankName.trim() : '',
      accountNumber: hasRefund ? accountNumber.trim() : '',
      accountHolderName: hasRefund ? accountHolderName.trim() : '',
    });
    setSubmitting(false);
    if (res.isSuccess) {
      onSuccess(res.refundAmount, res.message);
    } else {
      onSuccess(-1, res.message);
    }
  };

  const refundPct = preview && totalPrice > 0
    ? Math.round((preview.estimatedRefund / totalPrice) * 100)
    : null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => { if (!submitting) onClose(); }} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-bold text-gray-900">Xác nhận hủy booking</h3>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 overflow-y-auto">
          <p className="text-sm text-gray-600">
            Bạn đang hủy booking tại <span className="font-semibold text-gray-900">{homestayName}</span>.
            Hành động này không thể hoàn tác.
          </p>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
              <BadgePercent className="h-4 w-4" />
              Số tiền hoàn dự kiến
            </div>
            {previewLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tính toán...
              </div>
            ) : preview ? (
              <>
                <div className="flex items-end justify-between">
                  <span className={`text-2xl font-black ${preview.estimatedRefund > 0 ? 'text-blue-700' : 'text-red-500'}`}>
                    {preview.estimatedRefund > 0 ? `${preview.estimatedRefund.toLocaleString('vi-VN')}đ` : 'Không hoàn tiền'}
                  </span>
                  {refundPct !== null && preview.estimatedRefund > 0 && (
                    <span className="text-sm text-blue-500 font-medium">({refundPct}% tổng tiền)</span>
                  )}
                </div>
                <div className="flex items-start gap-1.5 text-xs text-blue-600">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {preview.message}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Không thể tính toán hoàn tiền lúc này.</p>
            )}
          </div>

          {hasRefund ? (
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <CreditCard className="h-4 w-4 text-blue-500" />
                Thông tin tài khoản nhận hoàn tiền
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ngân hàng <span className="text-red-500">*</span></label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chọn ngân hàng...</option>
                  {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Số tài khoản <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Nhập số tài khoản..."
                  disabled={submitting}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tên chủ tài khoản <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  disabled={submitting}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-orange-700">
                <CreditCard className="h-4 w-4" />
                Không hoàn tiền
              </div>
              <p className="text-xs text-orange-600 mt-2">Booking này không đủ điều kiện để hoàn tiền theo chính sách của hệ thống.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Lý do hủy <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Nhập lý do hủy booking..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Giữ lại
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !isValid}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Xác nhận hủy
          </button>
        </div>
      </div>
    </div>
  );
}
