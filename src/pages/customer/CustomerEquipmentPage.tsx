import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Search,
  Package,
  Plus,
  Minus,
  CheckCircle,
  Clock,
  XCircle,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import type { Equipment, EquipmentBorrow } from '../../types/equipment.types';

const CATEGORIES = ['Tất cả', 'Swimming', 'Water Sports', 'Sports', 'Beach', 'Other'];

interface BookingOption {
  id: string;
  homestayId?: string;
  homestayName: string;
  checkInDate: string;
  checkOutDate: string;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED';
}

const MOCK_BOOKINGS: BookingOption[] = [
  {
    id: 'bk-1',
    homestayId: 'hs-1',
    homestayName: 'Sunrise Beach Homestay',
    checkInDate: '2026-04-25',
    checkOutDate: '2026-04-28',
    status: 'CHECKED_IN',
  },
  {
    id: 'bk-2',
    homestayId: 'hs-2',
    homestayName: 'Blue Coral Retreat',
    checkInDate: '2026-04-27',
    checkOutDate: '2026-04-30',
    status: 'CONFIRMED',
  },
  {
    id: 'bk-3',
    homestayId: 'hs-3',
    homestayName: 'Ocean Breeze Villa',
    checkInDate: '2026-04-20',
    checkOutDate: '2026-04-22',
    status: 'COMPLETED',
  },
];

const MOCK_EQUIPMENT: Record<string, Equipment[]> = {
  'hs-1': [
    {
      id: 'eq-1',
      homestayId: 'hs-1',
      name: 'Kính bơi',
      category: 'Swimming',
      quantity: 20,
      available: 15,
      borrowed: 5,
      condition: 'good',
      description: 'Kính bơi chuyên nghiệp, chống tia UV',
      isActive: true,
    },
    {
      id: 'eq-2',
      homestayId: 'hs-1',
      name: 'Áo phao',
      category: 'Swimming',
      quantity: 30,
      available: 22,
      borrowed: 8,
      condition: 'good',
      description: 'Áo phao an toàn, nhiều size',
      isActive: true,
    },
  ],
  'hs-2': [
    {
      id: 'eq-3',
      homestayId: 'hs-2',
      name: 'Thuyền SUP',
      category: 'Water Sports',
      quantity: 5,
      available: 3,
      borrowed: 2,
      condition: 'good',
      description: 'Thuyền Stand-up Paddle board',
      isActive: true,
    },
    {
      id: 'eq-4',
      homestayId: 'hs-2',
      name: 'Bóng đá',
      category: 'Sports',
      quantity: 10,
      available: 8,
      borrowed: 2,
      condition: 'good',
      description: 'Bóng đá size 5 tiêu chuẩn',
      isActive: true,
    },
  ],
  'hs-3': [
    {
      id: 'eq-5',
      homestayId: 'hs-3',
      name: 'Bóng chuyền',
      category: 'Sports',
      quantity: 8,
      available: 6,
      borrowed: 2,
      condition: 'good',
      description: 'Bóng chuyền bãi biển',
      isActive: true,
    },
    {
      id: 'eq-6',
      homestayId: 'hs-3',
      name: 'Ván lướt sóng',
      category: 'Water Sports',
      quantity: 6,
      available: 4,
      borrowed: 1,
      condition: 'fair',
      description: 'Surfboard cho người mới',
      isActive: true,
    },
  ],
};

const MOCK_HISTORY: Record<string, EquipmentBorrow[]> = {
  'bk-1': [
    {
      id: 'req-1',
      bookingId: 'bk-1',
      equipmentId: 'eq-1',
      equipmentName: 'Kính bơi',
      quantity: 2,
      borrowDate: '2026-04-26 09:00',
      status: 'pending',
      note: 'Đang chờ nhân viên xác nhận',
    },
  ],
  'bk-2': [],
  'bk-3': [
    {
      id: 'req-2',
      bookingId: 'bk-3',
      equipmentId: 'eq-5',
      equipmentName: 'Bóng chuyền',
      quantity: 1,
      borrowDate: '2026-04-21 14:00',
      returnDate: '2026-04-21 16:00',
      status: 'returned',
    },
  ],
};

export default function CustomerEquipmentPage() {
  const navigate = useNavigate();

  const [bookings] = useState<BookingOption[]>(MOCK_BOOKINGS);
  const [selectedBooking, setSelectedBooking] = useState<BookingOption | null>(MOCK_BOOKINGS[0]);

  const [equipment, setEquipment] = useState<Equipment[]>(MOCK_EQUIPMENT[MOCK_BOOKINGS[0].homestayId || 'hs-1']);
  const [borrowHistory, setBorrowHistory] = useState<EquipmentBorrow[]>(MOCK_HISTORY[MOCK_BOOKINGS[0].id] || []);
  const [loading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [showCart, setShowCart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewTab, setViewTab] = useState<'browse' | 'requests'>('browse');

  useEffect(() => {
    if (selectedBooking) {
      const homestayId = selectedBooking.homestayId || 'hs-1';
      setEquipment(MOCK_EQUIPMENT[homestayId] || []);
      setBorrowHistory(MOCK_HISTORY[selectedBooking.id] || []);
      setCart({});
    }
  }, [selectedBooking]);

  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'Tất cả' || item.category === selectedCategory;
    return matchesSearch && matchesCategory && item.available > 0;
  });

  const handleAddToCart = (id: string) => {
    const item = equipment.find((e) => e.id === id);
    if (!item) return;

    const currentQty = cart[id] || 0;
    if (currentQty >= item.available) {
      toast.error('Vượt quá số lượng có sẵn!');
      return;
    }

    setCart({ ...cart, [id]: currentQty + 1 });
  };

  const handleRemoveFromCart = (id: string) => {
    const currentQty = cart[id] || 0;
    if (currentQty <= 0) return;

    if (currentQty === 1) {
      const newCart = { ...cart };
      delete newCart[id];
      setCart(newCart);
    } else {
      setCart({ ...cart, [id]: currentQty - 1 });
    }
  };

  const handleSubmitRequest = () => {
    const cartItems = Object.entries(cart);
    if (cartItems.length === 0) {
      toast.error('Giỏ hàng trống!');
      return;
    }

    if (!selectedBooking) {
      toast.error('Vui lòng chọn đặt phòng');
      return;
    }

    setIsSubmitting(true);
    const nextRequests: EquipmentBorrow[] = cartItems.map(([equipmentId, quantity]) => {
      const item = equipment.find((e) => e.id === equipmentId);
      return {
        id: `req-${Date.now()}-${equipmentId}`,
        bookingId: selectedBooking.id,
        equipmentId,
        equipmentName: item?.name || '',
        quantity,
        status: 'pending',
        borrowDate: new Date().toLocaleString('vi-VN'),
      };
    });

    setBorrowHistory((prev) => [...nextRequests, ...prev]);
    setEquipment((prev) =>
      prev.map((item) => {
        const qty = cart[item.id] || 0;
        if (!qty) return item;
        return {
          ...item,
          available: Math.max(0, item.available - qty),
          borrowed: item.borrowed + qty,
        };
      })
    );
    toast.success('Đã gửi yêu cầu mượn!');
    setCart({});
    setShowCart(false);
    setIsSubmitting(false);
  };

  const handleCancelRequest = (borrowId: string) => {
    const request = borrowHistory.find((item) => item.id === borrowId);
    if (!request) return;
    setBorrowHistory((prev) => prev.filter((item) => item.id !== borrowId));
    setEquipment((prev) =>
      prev.map((item) =>
        item.id === request.equipmentId
          ? { ...item, available: item.available + request.quantity, borrowed: Math.max(0, item.borrowed - request.quantity) }
          : item
      )
    );
    toast.success('Đã hủy yêu cầu');
  };

  const cartItemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const pendingRequests = borrowHistory.filter((r) => r.status === 'pending');
  const borrowedItems = borrowHistory.filter((r) => r.status === 'borrowed');

  return (
    <MainLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <p className="text-sm text-gray-600 mt-1">Mượn miễn phí các đồ dùng trong thời gian lưu trú</p>
        </div>

        {/* Booking Selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Chọn đặt phòng:</label>
            <select
              value={selectedBooking?.id || ''}
              onChange={(e) => {
                const booking = bookings.find((b) => b.id === e.target.value);
                setSelectedBooking(booking || null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            >
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.homestayName} - {b.checkInDate} to {b.checkOutDate}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl shadow-sm border border-orange-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Yêu cầu chờ xác nhận</p>
                <p className="text-3xl font-bold text-orange-900 mt-2">{pendingRequests.length}</p>
              </div>
              <Clock className="w-12 h-12 text-orange-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Đang mượn</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{borrowedItems.length}</p>
              </div>
              <Package className="w-12 h-12 text-blue-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex gap-4 border-b border-slate-200 pb-4 mb-4">
            <button
              onClick={() => setViewTab('browse')}
              className={`pb-2 font-medium transition-colors ${
                viewTab === 'browse'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Duyệt đồ dùng
            </button>
            <button
              onClick={() => setViewTab('requests')}
              className={`pb-2 font-medium transition-colors ${
                viewTab === 'requests'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yêu cầu của tôi
            </button>
          </div>

          {viewTab === 'browse' && (
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm đồ dùng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Cart Button */}
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-purple-500/30 whitespace-nowrap"
              >
                <ShoppingCart className="w-5 h-5" />
                Giỏ hàng
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                    {cartItemCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            <p className="mt-3 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : viewTab === 'browse' ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Đồ dùng có sẵn ({filteredEquipment.length})
            </h2>
            {filteredEquipment.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Không có đồ dùng nào
                </h3>
                <p className="text-slate-600">Thử thay đổi bộ lọc hoặc tìm kiếm</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEquipment.map((item) => {
                  const inCart = cart[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all"
                    >
                      {/* Image Placeholder */}
                      <div className="h-40 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                        <Package className="w-16 h-16 text-white opacity-50" />
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-900 text-lg">{item.name}</h3>
                            <p className="text-sm text-slate-500">{item.category}</p>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">
                            {item.available} còn
                          </span>
                        </div>

                        {item.description && (
                          <p className="text-sm text-slate-600 mb-4">{item.description}</p>
                        )}

                        {inCart > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRemoveFromCart(item.id)}
                              className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <div className="px-6 py-2 bg-purple-100 text-purple-700 rounded-xl font-bold text-lg">
                              {inCart}
                            </div>
                            <button
                              onClick={() => handleAddToCart(item.id)}
                              className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(item.id)}
                            className="w-full px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-purple-500/30"
                          >
                            <Plus className="w-5 h-5" />
                            Thêm vào giỏ
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Yêu cầu của tôi</h2>
            {borrowHistory.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Không có yêu cầu nào
                </h3>
                <p className="text-slate-600">Mượn một số đồ dùng bây giờ</p>
              </div>
            ) : (
              <div className="space-y-4">
                {borrowHistory.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h3 className="font-bold text-slate-900">{request.equipmentName}</h3>
                            <span
                              className={`px-3 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${
                                request.status === 'pending'
                                  ? 'bg-orange-100 text-orange-700'
                                  : request.status === 'borrowed'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {request.status === 'pending'
                                ? 'CHỜ XÁC NHẬN'
                                : request.status === 'borrowed'
                                ? 'ĐANG MƯỢN'
                                : 'ĐÃ TRẢ'}
                            </span>
                          </div>
                          <div className="flex gap-4 text-sm text-slate-600 flex-wrap">
                            <span>SL: {request.quantity}</span>
                            <span>Yêu cầu: {request.borrowDate}</span>
                            {request.returnDate && <span>Trả: {request.returnDate}</span>}
                          </div>
                        </div>
                      </div>

                      {request.status === 'pending' && (
                        <button
                          onClick={() => handleCancelRequest(request.id)}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold flex items-center gap-2 transition-colors flex-shrink-0"
                        >
                          <XCircle className="w-4 h-4" />
                          Hủy
                        </button>
                      )}

                      {request.status === 'borrowed' && (
                        <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-semibold flex-shrink-0">
                          Trả cho nhân viên
                        </div>
                      )}

                      {request.status === 'returned' && (
                        <div className="px-4 py-2 bg-green-50 text-green-700 rounded-xl font-semibold flex items-center gap-2 flex-shrink-0">
                          <CheckCircle className="w-4 h-4" />
                          Hoàn tất
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Cart Modal */}
      {showCart && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCart(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-purple-500" />
              Giỏ hàng của bạn
            </h2>

            {Object.keys(cart).length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Giỏ hàng trống</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                  {Object.entries(cart).map(([id, qty]) => {
                    const item = equipment.find((e) => e.id === id);
                    if (!item) return null;

                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{item.name}</h3>
                          <p className="text-sm text-slate-500">{item.category}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleRemoveFromCart(id)}
                            className="p-1 hover:bg-slate-200 rounded transition-colors"
                          >
                            <Minus className="w-4 h-4 text-slate-600" />
                          </button>
                          <span className="font-bold text-purple-600 min-w-[2rem] text-center">
                            {qty}
                          </span>
                          <button
                            onClick={() => handleAddToCart(id)}
                            className="p-1 hover:bg-slate-200 rounded transition-colors"
                          >
                            <Plus className="w-4 h-4 text-slate-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCart(false)}
                    className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                  >
                    Tiếp tục mua
                  </button>
                  <button
                    onClick={handleSubmitRequest}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  );
}
