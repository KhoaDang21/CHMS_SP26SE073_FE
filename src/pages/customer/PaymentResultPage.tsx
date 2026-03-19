import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { paymentService } from '../../services/paymentService';
import MainLayout from '../../layouts/MainLayout';
import toast from 'react-hot-toast';

type ResultState = 'loading' | 'success' | 'pending' | 'cancelled' | 'error';

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingId = searchParams.get('bookingId');
  const isCancelled = searchParams.get('cancel') === 'true' || searchParams.get('status') === 'CANCELLED';

  const [state, setState] = useState<ResultState>('loading');
  const [booking, setBooking] = useState<any>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setState('error');
      return;
    }
    checkBookingStatus();
  }, [bookingId]);

  const checkBookingStatus = async () => {
    if (!bookingId) return;
    setState('loading');
    try {
      const detail = await bookingService.getBookingDetail(bookingId);
      if (!detail) { setState('error'); return; }
      setBooking(detail);

      const status = (detail.status as string).toUpperCase();
      if (status === 'CONFIRMED') setState('success');
      else if (status === 'CANCELLED' || status === 'REJECTED') setState('cancelled');
      else setState('pending'); // PENDING = chưa thanh toán
    } catch {
      setState('error');
    }
  };

  const handleRetryPayment = async () => {
    if (!booking) return;
    setIsRetrying(true);
    try {
      const returnUrl = `${window.location.origin}/customer/payment-result?bookingId=${booking.id}`;
      const cancelUrl = `${window.location.origin}/customer/payment-result?bookingId=${booking.id}&cancel=true`;
      const res = await paymentService.createLink({ bookingId: booking.id, returnUrl, cancelUrl });
      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        toast.error('Không lấy được link thanh toán');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi tạo link thanh toán');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    setIsCancelling(true);
    try {
      const res = await bookingService.cancelBooking(booking.id);
      if (res?.success) {
        toast.success('Đã hủy booking');
        setState('cancelled');
        setBooking((prev: any) => ({ ...prev, status: 'cancelled' }));
      } else {
        toast.error(res?.message || 'Hủy booking thất bại');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi hủy booking');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatMoney = (n?: number) =>
    n != null ? `${n.toLocaleString('vi-VN')}đ` : '—';

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('vi-VN') : '—';

  return (
    <MainLayout>
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* LOADING */}
          {state === 'loading' && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Đang kiểm tra trạng thái thanh toán...</p>
            </div>
          )}

          {/* SUCCESS */}
          {state === 'success' && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-400 to-emerald-500 p-6 text-center">
                <CheckCircle className="w-16 h-16 text-white mx-auto mb-3" />
                <h1 className="text-2xl font-bold text-white">Thanh toán thành công!</h1>
                <p className="text-green-50 mt-1">Booking của bạn đã được xác nhận</p>
              </div>
              {booking && (
                <div className="p-6 space-y-3">
                  <BookingSummary booking={booking} formatMoney={formatMoney} formatDate={formatDate} />
                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={() => navigate('/customer/bookings')}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all flex items-center justify-center gap-2"
                    >
                      Xem đặt phòng <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PENDING - chưa thanh toán */}
          {state === 'pending' && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-6 text-center">
                <Clock className="w-16 h-16 text-white mx-auto mb-3" />
                <h1 className="text-2xl font-bold text-white">Chờ thanh toán</h1>
                <p className="text-yellow-50 mt-1">Booking đã tạo nhưng chưa được thanh toán</p>
              </div>
              {booking && (
                <div className="p-6 space-y-3">
                  <BookingSummary booking={booking} formatMoney={formatMoney} formatDate={formatDate} />
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
                    Booking sẽ tự động hủy nếu không thanh toán trong thời gian quy định.
                  </div>
                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={handleRetryPayment}
                      disabled={isRetrying}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isRetrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      {isRetrying ? 'Đang xử lý...' : 'Thanh toán ngay'}
                    </button>
                    <button
                      onClick={handleCancelBooking}
                      disabled={isCancelling}
                      className="flex-1 py-3 border border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {isCancelling ? 'Đang hủy...' : 'Hủy booking'}
                    </button>
                  </div>
                  <button
                    onClick={() => navigate('/customer/bookings')}
                    className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Xem tất cả đặt phòng
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CANCELLED */}
          {(state === 'cancelled') && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-gray-400 to-gray-500 p-6 text-center">
                <XCircle className="w-16 h-16 text-white mx-auto mb-3" />
                <h1 className="text-2xl font-bold text-white">Đã hủy</h1>
                <p className="text-gray-100 mt-1">
                  {isCancelled ? 'Bạn đã hủy thanh toán' : 'Booking này đã bị hủy'}
                </p>
              </div>
              <div className="p-6">
                {booking && <BookingSummary booking={booking} formatMoney={formatMoney} formatDate={formatDate} />}
                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => navigate('/')}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all"
                  >
                    Tìm homestay khác
                  </button>
                  <button
                    onClick={() => navigate('/customer/bookings')}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    Đặt phòng của tôi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ERROR */}
          {state === 'error' && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Không tìm thấy thông tin</h2>
              <p className="text-gray-500 text-sm mb-6">Không thể tải thông tin booking. Vui lòng kiểm tra lại.</p>
              <div className="flex gap-3">
                <button onClick={checkBookingStatus} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Thử lại
                </button>
                <button onClick={() => navigate('/customer/bookings')} className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all">
                  Đặt phòng của tôi
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
}

function BookingSummary({ booking, formatMoney, formatDate }: {
  booking: any;
  formatMoney: (n?: number) => string;
  formatDate: (d?: string) => string;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
      {booking.homestayName && (
        <div className="flex justify-between">
          <span className="text-gray-500">Homestay</span>
          <span className="font-medium text-gray-900 text-right max-w-[60%]">{booking.homestayName}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-gray-500">Nhận phòng</span>
        <span className="font-medium">{formatDate(booking.checkIn)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Trả phòng</span>
        <span className="font-medium">{formatDate(booking.checkOut)}</span>
      </div>
      {booking.totalPrice != null && (
        <div className="flex justify-between pt-2 border-t border-gray-200">
          <span className="text-gray-700 font-semibold">Tổng tiền</span>
          <span className="font-bold text-blue-600">{formatMoney(booking.totalPrice)}</span>
        </div>
      )}
    </div>
  );
}
