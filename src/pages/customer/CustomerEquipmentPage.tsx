import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Package, X, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../../layouts/MainLayout';
import { bookingService } from '../../services/bookingService';
import { equipmentLendingService } from '../../services/equipmentLendingService';
import type { Equipment, EquipmentBorrowRequest } from '../../types/equipment.types';

export default function CustomerEquipmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentBookingId, setCurrentBookingId] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [borrowQuantity, setBorrowQuantity] = useState(1);
  const [borrowNote, setBorrowNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [borrowRequests, setBorrowRequests] = useState<EquipmentBorrowRequest[]>([]);
  const [borrowRequestsLoading, setBorrowRequestsLoading] = useState(false);
  const [borrowRequestsError, setBorrowRequestsError] = useState<string | null>(null);

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

        if (selectedBooking?.id) {
          setCurrentBookingId(selectedBooking.id);
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

  useEffect(() => {
    let mounted = true;

    const loadBorrowRequests = async () => {
      setBorrowRequestsLoading(true);
      setBorrowRequestsError(null);

      try {
        const list = await equipmentLendingService.customerGetBorrowRequests();
        if (!mounted) return;
        setBorrowRequests(list);
      } catch (e: any) {
        if (!mounted) return;
        setBorrowRequestsError(e?.message ?? 'Không thể tải danh sách yêu cầu mượn.');
        setBorrowRequests([]);
      } finally {
        if (mounted) setBorrowRequestsLoading(false);
      }
    };

    loadBorrowRequests();

    return () => {
      mounted = false;
    };
  }, []);

  const handleBorrowClick = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setBorrowQuantity(1);
    setBorrowNote('');
  };

  const handleCloseBorrowModal = () => {
    setSelectedEquipment(null);
    setBorrowQuantity(1);
    setBorrowNote('');
  };

  const handleSubmitBorrow = async () => {
    if (!selectedEquipment || !currentBookingId) {
      toast.error('Không tìm thấy booking hoặc dụng cụ');
      return;
    }

    if (borrowQuantity <= 0) {
      toast.error('Số lượng phải lớn hơn 0');
      return;
    }

    if (borrowQuantity > (selectedEquipment.availableQuantity ?? selectedEquipment.available ?? 0)) {
      toast.error(
        'Số lượng không đủ. Chỉ còn ' + (selectedEquipment.availableQuantity ?? selectedEquipment.available ?? 0) + ' chiếc',
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await equipmentLendingService.customerBorrowEquipment({
        bookingId: currentBookingId,
        equipmentId: selectedEquipment.id,
        quantity: borrowQuantity,
        note: borrowNote || undefined,
      });

      toast.success('Yêu cầu mượn đồ thành công! Vui lòng chờ nhân viên xác nhận.');
      handleCloseBorrowModal();
      const updatedRequests = await equipmentLendingService.customerGetBorrowRequests();
      setBorrowRequests(updatedRequests);
    } catch (e: any) {
      toast.error(e?.message ?? 'Không thể gửi yêu cầu mượn');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBorrowStatusMeta = (status: string) => {
    const normalized = status.toLowerCase();

    switch (normalized) {
      case 'pending':
      case 'requested':
        return {
          label: 'Chờ xác nhận',
          className: 'bg-amber-50 text-amber-700 border-amber-100',
        };
      case 'approved':
      case 'accepted':
        return {
          label: 'Đã duyệt',
          className: 'bg-sky-50 text-sky-700 border-sky-100',
        };
      case 'handedover':
      case 'borrowed':
      case 'in_progress':
        return {
          label: 'Đang mượn',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        };
      case 'returned':
        return {
          label: 'Đã trả',
          className: 'bg-gray-100 text-gray-700 border-gray-200',
        };
      case 'rejected':
      case 'cancelled':
        return {
          label: 'Từ chối',
          className: 'bg-red-50 text-red-700 border-red-100',
        };
      default:
        return {
          label: status || 'Không rõ',
          className: 'bg-gray-100 text-gray-700 border-gray-200',
        };
    }
  };

  const formatRequestTime = (value?: string) => {
    if (!value) return 'Chưa có thời gian';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <MainLayout>
      <main className="relative min-h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50/40 to-cyan-100/50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-purple-300/20 blur-3xl" />
        <div className="relative mx-auto flex max-w-7xl flex-col">
        <button
          onClick={() => navigate('/customer/bookings')}
          className="mb-6 inline-flex w-fit self-start items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-slate-900"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại booking
        </button>

        <div className="mb-5 max-w-2xl rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
          <h1 className="flex items-center gap-3 text-xl font-bold text-slate-900 sm:text-2xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-500/20">
              <Package className="w-5 h-5" />
            </span>
            Mượn đồ dùng
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-600">
            Chọn đồ dùng để mượn từ homestay của bạn, gửi yêu cầu và theo dõi trạng thái ngay bên dưới.
          </p>
        </div>

        <div className="mb-5 grid max-w-3xl grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-[22px] border border-white/70 bg-gradient-to-br from-white via-cyan-50 to-cyan-100/70 px-4 py-3.5 shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">Tổng dụng cụ</p>
            <p className="mt-1.5 text-2xl font-black text-slate-900">{equipments.length}</p>
          </div>

          <div className="rounded-[22px] border border-white/70 bg-gradient-to-br from-white via-emerald-50 to-emerald-100/70 px-4 py-3.5 shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">Trạng thái</p>
            <p className="mt-1.5 text-2xl font-black text-slate-900">{loading ? 'Đang tải' : 'Sẵn sàng'}</p>
          </div>

          {/* <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-purple-600 uppercase">Điểm vào</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">Customer</p>
          </div> */}
        </div>

        <div className="flex-1">
          {loading ? (
            <div className="flex h-[320px] items-center justify-center rounded-[28px] border border-white/70 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="text-center">
                <div className="inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-cyan-500 border-r-2 border-t-2 border-r-transparent border-t-transparent" />
                <p className="mt-3 text-slate-600">Đang tải danh sách dụng cụ...</p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="font-semibold text-amber-950">{error}</p>
              <p className="mt-2 text-sm text-amber-800">Hãy kiểm tra lại booking hoặc liên hệ homestay.</p>
            </div>
          ) : equipments.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center rounded-[28px] border border-dashed border-white/70 bg-white/85 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="text-center px-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-100 to-cyan-100 shadow-sm">
                  <Package className="w-8 h-8 text-purple-600" />
                </div>
                <p className="font-semibold text-slate-800">Không có dụng cụ nào sẵn có.</p>
                <p className="mt-1 text-sm text-slate-500">Homestay này chưa cấu hình danh sách equipment.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
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
                  <div key={eq.id} className="group overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
                    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
                      <div className="relative min-h-[220px] overflow-hidden bg-gradient-to-br from-slate-100 via-purple-100 to-cyan-100">
                        {eq.imageUrl ? (
                          <img src={eq.imageUrl} alt={eq.name} className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Package className="w-14 h-14 text-purple-500" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm ${statusClass}`}>
                            {statusLabel}
                          </span>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm ${conditionClass}`}>
                            {conditionLabel}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="truncate text-xl font-bold text-slate-900">{eq.name}</h3>
                            <p className="mt-1 text-sm text-slate-500">{eq.category}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Giá thuê</p>
                            <p className="text-lg font-black text-slate-900">{rentalFee.toLocaleString('vi-VN')}₫</p>
                          </div>
                        </div>

                        <p className="mt-4 min-h-[6rem] text-sm leading-6 text-slate-600 line-clamp-4">
                          {eq.description || 'Chưa có mô tả chi tiết cho dụng cụ này.'}
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                            <p className="text-xs text-slate-500">Tổng số lượng</p>
                            <p className="mt-1 text-base font-semibold text-slate-900">{totalCount}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                            <p className="text-xs text-slate-500">Còn khả dụng</p>
                            <p className="mt-1 text-base font-semibold text-slate-900">{availableCount}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                            <p className="text-xs text-slate-500">Tiền cọc</p>
                            <p className="mt-1 text-base font-semibold text-slate-900">{deposit.toLocaleString('vi-VN')}₫</p>
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                            <p className="text-xs text-slate-500">Homestay</p>
                            <p className="mt-1 truncate text-base font-semibold text-slate-900">{eq.homestayId}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleBorrowClick(eq)}
                          disabled={availableCount === 0}
                          className="mt-5 w-full rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-600 px-4 py-3 text-center font-semibold text-white shadow-[0_14px_35px_rgba(124,58,237,0.25)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(124,58,237,0.32)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {availableCount === 0 ? 'Hết hàng' : 'Mượn đồ dùng'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <section className="mt-8 overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_16px_42px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Yêu cầu mượn của tôi</h2>
              <p className="mt-1 text-sm text-slate-500">Theo dõi các đơn mượn dụng cụ đã gửi.</p>
            </div>
            <span className="rounded-full bg-gradient-to-r from-purple-50 to-cyan-50 px-3 py-1 text-xs font-semibold text-purple-700 ring-1 ring-purple-100">
              {borrowRequests.length} yêu cầu
            </span>
          </div>

          <div className="bg-gradient-to-b from-white to-slate-50/40 p-5">
            {borrowRequestsLoading ? (
              <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
                <p className="text-sm text-slate-500">Đang tải yêu cầu mượn...</p>
              </div>
            ) : borrowRequestsError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {borrowRequestsError}
              </div>
            ) : borrowRequests.length === 0 ? (
              <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
                <div className="text-center">
                  <Package className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 font-semibold text-slate-700">Chưa có yêu cầu mượn nào</p>
                  <p className="mt-1 text-sm text-slate-500">Khi gửi yêu cầu, chúng sẽ hiển thị ở đây.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {borrowRequests.map((request) => {
                  const statusMeta = getBorrowStatusMeta(request.status);

                  return (
                    <article
                      key={request.id}
                      className="rounded-2xl border border-slate-100 bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">{request.equipmentName}</h3>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-slate-600">
                            Homestay: <span className="font-medium text-slate-900">{request.homestayName || request.homestayId}</span>
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            Số lượng: <span className="font-medium text-slate-900">{request.quantity}</span>
                          </p>
                        </div>

                        <div className="text-sm text-slate-600 lg:text-right">
                          <p>Thời gian gửi: <span className="font-medium text-slate-900">{formatRequestTime(request.requestedAt)}</span></p>
                          {request.approvedAt && <p className="mt-1">Duyệt: <span className="font-medium text-slate-900">{formatRequestTime(request.approvedAt)}</span></p>}
                          {request.handedOverAt && <p className="mt-1">Bàn giao: <span className="font-medium text-slate-900">{formatRequestTime(request.handedOverAt)}</span></p>}
                          {request.returnedAt && <p className="mt-1">Đã trả: <span className="font-medium text-slate-900">{formatRequestTime(request.returnedAt)}</span></p>}
                        </div>
                      </div>

                      {(request.note || request.rejectReason) && (
                        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
                          {request.note && <p><span className="font-semibold text-slate-900">Ghi chú:</span> {request.note}</p>}
                          {request.rejectReason && <p className="mt-1"><span className="font-semibold text-slate-900">Lý do từ chối:</span> {request.rejectReason}</p>}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Borrow Modal */}
        {selectedEquipment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
              <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-purple-50 to-cyan-50 px-6 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-purple-600">Tạo yêu cầu</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">Mượn {selectedEquipment.name}</h2>
                </div>
                <button
                  onClick={handleCloseBorrowModal}
                  type="button"
                  className="rounded-full p-2 text-slate-500 transition hover:bg-white hover:text-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Số lượng muốn mượn</p>
                  <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <button
                      onClick={() => setBorrowQuantity(Math.max(1, borrowQuantity - 1))}
                      type="button"
                      className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Minus className="w-4 h-4 text-slate-600" />
                    </button>
                    <input
                      type="number"
                      value={borrowQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) setBorrowQuantity(Math.max(1, val));
                      }}
                      className="flex-1 bg-transparent text-center text-lg font-bold text-slate-900 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        const available = selectedEquipment.availableQuantity ?? selectedEquipment.available ?? 0;
                        setBorrowQuantity(Math.min(available, borrowQuantity + 1));
                      }}
                      type="button"
                      className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Plus className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Có sẵn: {selectedEquipment.availableQuantity ?? selectedEquipment.available ?? 0} chiếc
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700">Ghi chú (tùy chọn)</p>
                  <textarea
                    value={borrowNote}
                    onChange={(e) => setBorrowNote(e.target.value)}
                    placeholder="Thêm ghi chú hoặc yêu cầu đặc biệt..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    rows={3}
                  />
                </div>

                <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Chi phí dự kiến</p>
                  <p className="mt-2 text-lg font-black text-slate-900">
                    {((selectedEquipment.rentalFee ?? 0) * borrowQuantity).toLocaleString('vi-VN')}₫
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Tiền cọc: {((selectedEquipment.depositAmount ?? 0) * borrowQuantity).toLocaleString('vi-VN')}₫
                  </p>
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
                <button
                  onClick={handleCloseBorrowModal}
                  type="button"
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Huỷ bỏ
                </button>
                <button
                  onClick={handleSubmitBorrow}
                  disabled={isSubmitting}
                  type="button"
                  className="flex-1 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-600 px-4 py-2.5 font-semibold text-white shadow-[0_14px_35px_rgba(124,58,237,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(124,58,237,0.32)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Xác nhận mượn'}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </MainLayout>
  );
}
