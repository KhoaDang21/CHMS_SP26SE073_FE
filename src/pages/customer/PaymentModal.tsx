import { useState } from 'react';
import { X, CreditCard, Calendar, Users, MapPin, Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import toast from 'react-hot-toast';

interface BookingInfo {
  id: string;
  homestayName: string;
  checkIn: string;
  checkOut: string;
  totalNights: number;
  guestsCount: number;
  pricePerNight: number;
  totalPrice: number;
  depositAmount?: number;   // tiền cọc thực tế từ BE (sau khi booking tạo xong)
  remainingAmount?: number; // còn lại từ BE
  paymentLabel?: string;
}

interface PaymentModalProps {
  booking: BookingInfo;
  onClose: () => void;
  onBack: () => void;
}

export default function PaymentModal({ booking, onClose, onBack }: PaymentModalProps) {
  const [isPaying, setIsPaying] = useState(false);

  const formatMoney = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

  const handlePay = async () => {
    setIsPaying(true);
    try {
      const returnUrl = `${window.location.origin}/customer/payment-result?bookingId=${booking.id}`;
      const cancelUrl = `${window.location.origin}/customer/payment-result?bookingId=${booking.id}&cancel=true`;

      const res = await paymentService.createLink({
        bookingId: booking.id,
        cancelUrl,
        returnUrl,
      });

      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        toast.error('Không lấy được link thanh toán');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Đã xảy ra lỗi khi tạo thanh toán');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Quay lại</span>
          </button>
          <h2 className="text-lg font-semibold text-gray-900">{booking.paymentLabel ?? 'Thanh Toán'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Booking Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
            <h3 className="font-semibold text-gray-900 mb-3">Thông tin đặt phòng</h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium text-gray-900">{booking.homestayName}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  {new Date(booking.checkIn).toLocaleDateString('vi-VN')}
                  {' → '}
                  {new Date(booking.checkOut).toLocaleDateString('vi-VN')}
                  <span className="text-gray-500 ml-1">({booking.totalNights} đêm)</span>
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-sm text-gray-700">{booking.guestsCount} khách</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-100 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{formatMoney(booking.pricePerNight)} × {booking.totalNights} đêm</span>
                <span>{formatMoney(booking.pricePerNight * booking.totalNights)}</span>
              </div>
              {/* Tổng tiền */}
              <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1.5 border-t border-blue-100">
                <span>Tổng tiền</span>
                <span>{formatMoney(booking.totalPrice)}</span>
              </div>
              {/* Breakdown cọc / còn lại */}
              {(() => {
                const deposit = booking.depositAmount ?? booking.totalPrice * 0.5;
                const remaining = booking.remainingAmount ?? booking.totalPrice - deposit;
                const isDepositPayment = !booking.paymentLabel || booking.paymentLabel === 'Đặt cọc';
                return (
                  <div className="mt-2 pt-2 border-t border-dashed border-orange-200 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className={`font-semibold ${isDepositPayment ? 'text-orange-600' : 'text-gray-500'}`}>
                        {isDepositPayment ? '→ Cọc ngay (20%)' : 'Đã cọc'}
                      </span>
                      <span className={`font-bold ${isDepositPayment ? 'text-orange-600' : 'text-gray-500'}`}>
                        {formatMoney(deposit)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={`${!isDepositPayment ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                        {!isDepositPayment ? '→ Còn lại thanh toán' : 'Còn lại khi nhận phòng'}
                      </span>
                      <span className={`font-bold ${!isDepositPayment ? 'text-blue-600' : 'text-gray-500'}`}>
                        {formatMoney(remaining)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Phương thức thanh toán</h3>
            <div className="border-2 border-blue-500 bg-blue-50 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">PayOS</p>
                <p className="text-xs text-gray-500">Thanh toán qua cổng PayOS (ATM, Visa, QR)</p>
              </div>
              <div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>
          </div>

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={isPaying}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPaying ? (
              <><Loader2 className="w-5 h-5 animate-spin" />Đang xử lý...</>
            ) : (
              <><ExternalLink className="w-5 h-5" />
                Đặt cọc {formatMoney(booking.depositAmount ?? booking.totalPrice * 0.5)}</>
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            Bạn sẽ được chuyển đến trang thanh toán an toàn của PayOS
          </p>
        </div>
      </div>
    </div>
  );
}
