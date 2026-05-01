import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import MainLayout from '../../layouts/MainLayout';
import { bookingService } from '../../services/bookingService';
import { equipmentLendingService } from '../../services/equipmentLendingService';
import type { Equipment } from '../../types/equipment.types';

export default function CustomerEquipmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const bookingIdFromQuery = searchParams.get('bookingId')?.trim();
        const homestayIdFromQuery = searchParams.get('homestayId')?.trim();
        const myBookings = await bookingService.getMyBookings();

        const selectedBooking = bookingIdFromQuery
          ? myBookings.find((booking) => booking.id === bookingIdFromQuery)
          : myBookings.find((booking) => booking.status === 'CHECKED_IN' || booking.status === 'CONFIRMED');

        const homestayId = homestayIdFromQuery || selectedBooking?.homestayId;

        if (!homestayId) {
          if (bookingIdFromQuery || homestayIdFromQuery) {
            setError('Không tìm thấy homestay hợp lệ để tải dụng cụ.');
          } else {
            setError('Không tìm thấy booking phù hợp (hãy check-in trước khi mượn đồ).');
          }
          setEquipments([]);
          return;
        }

        const list = await equipmentLendingService.customerGetEquipment(homestayId);
        if (!mounted) return;
        setEquipments(list);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? 'Không thể tải danh sách dụng cụ.');
        setEquipments([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  return (
    <MainLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-180px)] flex flex-col">
        <button
          onClick={() => navigate('/customer/bookings')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 mb-6"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại booking
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-purple-600" />
            Mượn đồ dùng
          </h1>
          <p className="text-sm text-gray-600 mt-1">Chọn đồ dùng để mượn từ homestay của bạn.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-cyan-600 uppercase">Tổng dụng cụ</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{equipments.length}</p>
            <p className="mt-1 text-sm text-gray-500">Danh sách đồ dùng theo homestay đang chọn.</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-emerald-600 uppercase">Trạng thái</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{loading ? 'Đang tải' : 'Sẵn sàng'}</p>
            <p className="mt-1 text-sm text-gray-500">Trang đã bám đúng booking/homestay từ URL.</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-purple-600 uppercase">Điểm vào</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">Customer</p>
            <p className="mt-1 text-sm text-gray-500">Chỉ hiển thị dụng cụ của homestay đang ở.</p>
          </div>
        </div>

        <div className="flex-1">
          {loading ? (
            <div className="flex h-[320px] items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
                <p className="mt-3 text-gray-600">Đang tải danh sách dụng cụ...</p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-8 text-center shadow-sm">
              <p className="text-yellow-900 font-semibold">{error}</p>
              <p className="text-sm text-yellow-800 mt-2">Hãy kiểm tra lại booking hoặc liên hệ homestay.</p>
            </div>
          ) : equipments.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white shadow-sm">
              <div className="text-center px-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-purple-500" />
                </div>
                <p className="text-gray-700 font-semibold">Không có dụng cụ nào sẵn có.</p>
                <p className="text-sm text-gray-500 mt-1">Homestay này chưa cấu hình danh sách equipment.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
              {equipments.map((eq) => {
                const availableCount = eq.availableQuantity ?? eq.available ?? 0;
                const totalCount = eq.totalQuantity ?? eq.quantity ?? availableCount;
                const deposit = eq.depositAmount ?? 0;
                const rentalFee = eq.rentalFee ?? 0;
                const statusLabel = eq.isActive ? 'Đang bật' : 'Đang ẩn';
                const statusClass = eq.isActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-gray-100 text-gray-600 border-gray-200';
                const conditionLabel =
                  eq.condition === 'maintenance' ? 'Bảo trì' : eq.condition === 'fair' ? 'Khá' : 'Tốt';
                const conditionClass =
                  eq.condition === 'maintenance'
                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                    : eq.condition === 'fair'
                      ? 'bg-sky-50 text-sky-700 border-sky-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100';

                return (
                  <div key={eq.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
                      <div className="relative min-h-[220px] bg-gradient-to-br from-purple-50 to-cyan-50">
                        {eq.imageUrl ? (
                          <img src={eq.imageUrl} alt={eq.name} className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Package className="w-14 h-14 text-purple-500" />
                          </div>
                        )}
                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass}`}>
                            {statusLabel}
                          </span>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${conditionClass}`}>
                            {conditionLabel}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 flex flex-col">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="text-xl font-bold text-gray-900 truncate">{eq.name}</h3>
                            <p className="mt-1 text-sm text-gray-500">{eq.category}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-gray-500">Giá thuê</p>
                            <p className="text-lg font-bold text-gray-900">{rentalFee.toLocaleString('vi-VN')}₫</p>
                          </div>
                        </div>

                        <p className="mt-4 text-sm text-gray-600 leading-6 line-clamp-4 min-h-[6rem]">
                          {eq.description || 'Chưa có mô tả chi tiết cho dụng cụ này.'}
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-gray-50 px-4 py-3">
                            <p className="text-xs text-gray-500">Tổng số lượng</p>
                            <p className="mt-1 text-base font-semibold text-gray-900">{totalCount}</p>
                          </div>
                          <div className="rounded-2xl bg-gray-50 px-4 py-3">
                            <p className="text-xs text-gray-500">Còn khả dụng</p>
                            <p className="mt-1 text-base font-semibold text-gray-900">{availableCount}</p>
                          </div>
                          <div className="rounded-2xl bg-gray-50 px-4 py-3">
                            <p className="text-xs text-gray-500">Tiền cọc</p>
                            <p className="mt-1 text-base font-semibold text-gray-900">{deposit.toLocaleString('vi-VN')}₫</p>
                          </div>
                          <div className="rounded-2xl bg-gray-50 px-4 py-3">
                            <p className="text-xs text-gray-500">Homestay</p>
                            <p className="mt-1 text-base font-semibold text-gray-900 truncate">{eq.homestayId}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </MainLayout>
  );
}
