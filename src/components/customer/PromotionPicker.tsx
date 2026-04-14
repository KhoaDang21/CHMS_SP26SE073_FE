import { BadgePercent, Check, Loader2, Ticket } from 'lucide-react';
import type { Promotion } from '../../types/promotion.types';

interface PromotionPickerProps {
  promotions: Promotion[];
  loading: boolean;
  selectedPromotionId: string | null;
  bookingTotal?: number;
  onSelectPromotion: (promotionId: string | null) => void;
}

const formatMoney = (value: number) => `${Math.round(value).toLocaleString('vi-VN')}đ`;

const getMinBookingAmount = (promotion: Promotion) => promotion.minBookingAmount ?? promotion.minBookingValue ?? 0;

const getEstimatedDiscount = (promotion: Promotion, bookingTotal?: number) => {
  if (typeof bookingTotal !== 'number' || bookingTotal <= 0) return null;

  if (Number(promotion.discountPercent || 0) > 0) {
    const rawDiscount = (bookingTotal * Number(promotion.discountPercent || 0)) / 100;
    const cappedDiscount = promotion.maxDiscountAmount ? Math.min(rawDiscount, promotion.maxDiscountAmount) : rawDiscount;
    return Math.max(0, Math.round(cappedDiscount));
  }

  if (Number(promotion.discountAmount || 0) > 0) {
    return Math.max(0, Math.round(Math.min(promotion.discountAmount, bookingTotal)));
  }

  return null;
};

const getDiscountSummary = (promotion: Promotion) => {
  const percent = Number(promotion.discountPercent || 0);
  const amount = Number(promotion.discountAmount || 0);

  if (percent > 0) {
    const maxText = promotion.maxDiscountAmount ? `, tối đa ${formatMoney(Number(promotion.maxDiscountAmount))}` : '';
    return `Giảm ${percent}%${maxText}`;
  }

  if (amount > 0) {
    return `Giảm ${formatMoney(amount)}`;
  }

  return 'Ưu đãi dành cho đơn đặt phòng';
};

const getValidityText = (promotion: Promotion) => {
  const start = promotion.startDate ? new Date(promotion.startDate).toLocaleDateString('vi-VN') : '';
  const end = promotion.endDate ? new Date(promotion.endDate).toLocaleDateString('vi-VN') : '';

  if (start && end) return `${start} - ${end}`;
  if (start) return `Từ ${start}`;
  if (end) return `Đến ${end}`;
  return 'Đang áp dụng';
};

export default function PromotionPicker({
  promotions,
  loading,
  selectedPromotionId,
  bookingTotal,
  onSelectPromotion,
}: PromotionPickerProps) {
  return (
    <div className="rounded-xl border border-dashed border-cyan-200 bg-cyan-50/60 p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-700 font-semibold">
            <BadgePercent className="w-4 h-4" />
            Mã giảm giá khả dụng
          </div>
          <p className="text-sm text-cyan-900/70 mt-1">Chọn một mã để xem mức giảm và áp dụng cho booking hiện tại.</p>
        </div>
        <button
          type="button"
          onClick={() => onSelectPromotion(null)}
          className="text-xs font-semibold text-cyan-700 hover:text-cyan-900 transition-colors"
        >
          Bỏ chọn
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-600 py-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Đang tải mã giảm giá...
        </div>
      ) : promotions.length === 0 ? (
        <div className="text-sm text-gray-600 bg-white/80 rounded-lg border border-cyan-100 p-3">
          Hiện chưa có mã giảm giá khả dụng cho booking này.
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((promotion) => {
            const selected = promotion.id === selectedPromotionId;
            const minBookingAmount = getMinBookingAmount(promotion);
            const eligible = !bookingTotal || bookingTotal >= minBookingAmount;
            const estimatedDiscount = getEstimatedDiscount(promotion, bookingTotal);

            return (
              <button
                key={promotion.id}
                type="button"
                onClick={() => eligible && onSelectPromotion(selected ? null : promotion.id)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${selected
                  ? 'border-cyan-500 bg-cyan-50 shadow-sm'
                  : 'border-cyan-100 bg-white hover:border-cyan-200 hover:shadow-sm'
                  } ${eligible ? '' : 'opacity-70 cursor-not-allowed'}`}
                disabled={!eligible}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? 'bg-cyan-500 text-white' : 'bg-cyan-100 text-cyan-700'}`}>
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-gray-900 text-sm sm:text-base">{promotion.code}</div>
                        <div className="text-sm text-gray-600 mt-0.5 line-clamp-2">{promotion.description || 'Mã giảm giá áp dụng cho booking'}</div>
                      </div>
                      {selected && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-600 text-white">
                          <Check className="w-3 h-3" /> Đang chọn
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                      <div className="rounded-lg bg-cyan-50 px-3 py-2">
                        <span className="font-semibold text-cyan-800">{getDiscountSummary(promotion)}</span>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        Đơn tối thiểu: <span className="font-semibold text-gray-900">{minBookingAmount > 0 ? formatMoney(minBookingAmount) : 'Không yêu cầu'}</span>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="px-2.5 py-1 rounded-full bg-gray-100">{getValidityText(promotion)}</span>
                      {typeof bookingTotal === 'number' && bookingTotal > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                          Ước tính giảm: {estimatedDiscount !== null ? formatMoney(estimatedDiscount) : '—'}
                        </span>
                      )}
                    </div>

                    {!eligible && bookingTotal && (
                      <p className="mt-2 text-xs text-amber-700">
                        Chưa đạt điều kiện tối thiểu để áp dụng mã này.
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}