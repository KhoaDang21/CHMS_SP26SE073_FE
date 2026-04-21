import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Menu, X, LogOut, Building2, Search, Loader2, QrCode,
    CheckCircle2, Clock, DollarSign, Copy, ExternalLink, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/authService';
import { RoleBadge } from '../../components/common/RoleBadge';
import { adminNavItems } from '../../config/adminNavItems';
import { refundService, type PendingRefund } from '../../services/refundService';

export default function AdminRefundsPage() {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [refunds, setRefunds] = useState<PendingRefund[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [confirmTarget, setConfirmTarget] = useState<string | null>(null); // id đang chờ xác nhận
    const [selectedRefund, setSelectedRefund] = useState<PendingRefund | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const user = authService.getCurrentUser();

    const load = async () => {
        setLoading(true);
        try {
            const data = await refundService.getAllRefunds();
            setRefunds(data.filter((r) => r.refundAmount > 0).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch {
            toast.error('Không thể tải danh sách hoàn tiền');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = refunds.filter((r) => {
        if (r.refundAmount <= 0) return false;
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        return (
            r.bookingId.toLowerCase().includes(q) ||
            r.accountHolderName.toLowerCase().includes(q) ||
            r.bankName.toLowerCase().includes(q) ||
            r.accountNumber.includes(q)
        );
    });

    const handleConfirm = async (id: string) => {
        setConfirmingId(id);
        setConfirmTarget(null);
        try {
            const success = await refundService.confirmRefund(id);
            if (success) {
                toast.success('Đã xác nhận hoàn tiền thành công');
                setSelectedRefund(null);
                await load();
            } else {
                toast.error('Không thể xác nhận hoàn tiền');
            }
        } catch (e) {
            toast.error('Có lỗi xảy ra');
        } finally {
            setConfirmingId(null);
        }
    };

    const handleLogout = () => {
        authService.logout();
        navigate('/auth/login');
    };

    const pendingCount = refunds.filter((r) => r.refundStatus === 'PENDING' && r.refundAmount > 0).length;
    const completedCount = refunds.filter((r) => r.refundStatus === 'COMPLETED' && r.refundAmount > 0).length;

    const openDetail = async (refund: PendingRefund) => {
        setSelectedRefund(refund);
        setDetailLoading(true);
        try {
            const detail = await refundService.getRefundDetail(refund.id);
            if (detail) {
                setSelectedRefund(detail);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } bg-white shadow-lg w-64`}
            >
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-8 h-8 text-blue-600" />
                        <div>
                            <h1 className="font-bold text-gray-900">CHMS Admin</h1>
                            <p className="text-xs text-gray-500">Management System</p>
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] pb-32">
                    {adminNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.id === 'refunds';
                        return (
                            <button
                                key={item.id}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                            {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{user?.name ?? 'Admin'}</p>
                            <div className="mt-1">{user?.role && <RoleBadge role={user.role} size="sm" />}</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className={`transition-all ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
                {/* Header */}
                <header className="bg-white shadow-sm sticky top-0 z-30">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
                                <Menu className="w-6 h-6" />
                            </button>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Quản lý Hoàn Tiền</h2>
                                <p className="text-gray-600 text-sm">Xác nhận và theo dõi các yêu cầu hoàn tiền từ khách</p>
                            </div>
                        </div>
                        <button
                            onClick={load}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Tải lại
                        </button>
                    </div>
                </header>

                <div className="p-6 space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm mb-1">Tổng yêu cầu hoàn</p>
                                    <p className="text-3xl font-bold text-gray-900">{refunds.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <DollarSign className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm mb-1">Chưa xử lý</p>
                                    <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
                                </div>
                                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm mb-1">Đã xử lý</p>
                                    <p className="text-3xl font-bold text-gray-900">{completedCount}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Info banner */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-1">Hướng dẫn xử lý hoàn tiền:</p>
                            <ol className="list-decimal list-inside space-y-1 text-xs">
                                <li>Quét mã QR bằng ứng dụng ngân hàng để chuyển tiền</li>
                                <li>Sau khi chuyển thành công, bấm nút "Xác nhận đã hoàn"</li>
                                <li>Trạng thái sẽ đổi thành "Đã hoàn tiền"</li>
                            </ol>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="bg-white rounded-xl shadow-sm p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm theo mã đơn, tên chủ tài khoản, ngân hàng, STK..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* List */}
                    {loading ? (
                        <div className="bg-white rounded-xl shadow-md p-12 text-center">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">Đang tải danh sách hoàn tiền...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-md p-12 text-center">
                            <QrCode className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">Không có yêu cầu hoàn tiền nào</p>
                            <p className="text-gray-400 text-sm mt-1">Tất cả yêu cầu hoàn tiền đã được xử lý</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filtered.map((refund) => {
                                const hasRefund = refund.refundAmount > 0;
                                return (
                                <div
                                    key={refund.id}
                                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-5"
                                >
                                    {/* Top row: mã đơn + badge trạng thái */}
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="min-w-0">
                                            <div className="font-semibold text-gray-900 truncate text-sm">
                                                Mã đơn: <span className="text-blue-600 font-mono">{refund.bookingId}</span>
                                            </div>
                                            <div className="text-sm text-gray-600 mt-0.5">
                                                Chủ tài khoản:{' '}
                                                <span className="font-medium text-gray-900">
                                                    {refund.accountHolderName || '—'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {!hasRefund ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                                                    Không hoàn tiền
                                                </span>
                                            ) : refund.refundStatus === 'PENDING' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Chưa xử lý
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Đã hoàn
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Info grid + actions cùng hàng */}
                                    <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-gray-500 text-xs mb-1">Ngân hàng</p>
                                                <p className="font-medium text-gray-900">{refund.bankName || '—'}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-gray-500 text-xs mb-1">STK</p>
                                                <p className="font-mono text-gray-900">{refund.accountNumber || '—'}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-gray-500 text-xs mb-1">Số tiền</p>
                                                <p className={`font-bold ${hasRefund ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {refund.refundAmount.toLocaleString('vi-VN')}đ
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-gray-500 text-xs mb-1">
                                                    {refund.refundStatus === 'COMPLETED' ? 'Ngày đã hoàn' : 'Ngày yêu cầu'}
                                                </p>
                                                <p className="text-gray-900">
                                                    {refund.refundStatus === 'COMPLETED' && refund.refundedAt
                                                        ? new Date(refund.refundedAt).toLocaleDateString('vi-VN')
                                                        : new Date(refund.createdAt).toLocaleDateString('vi-VN')}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions — chỉ hiện khi có tiền hoàn và chưa xử lý */}
                                        {hasRefund && refund.refundStatus === 'PENDING' && (
                                            <div className="flex gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => openDetail(refund)}
                                                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-sm transition-colors whitespace-nowrap"
                                                >
                                                    <QrCode className="w-4 h-4" />
                                                    Xem QR
                                                </button>
                                                <button
                                                    onClick={() => setConfirmTarget(refund.id)}
                                                    disabled={confirmingId === refund.id}
                                                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
                                                >
                                                    {confirmingId === refund.id
                                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                                        : <CheckCircle2 className="w-4 h-4" />}
                                                    Xác nhận đã hoàn
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar overlay mobile */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* QR Detail Modal */}
            {selectedRefund && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedRefund(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between text-white">
                            <div>
                                <h2 className="text-xl font-bold">Chi tiết hoàn tiền</h2>
                                <p className="text-blue-100 text-sm">Mã đơn: {selectedRefund.bookingId}</p>
                            </div>
                            <button
                                onClick={() => setSelectedRefund(null)}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {detailLoading ? (
                            <div className="p-12 text-center">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-gray-600">Đang tải...</p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-6">
                                {/* Bank info */}
                                <div className="rounded-xl bg-gray-50 border border-gray-200 p-5 space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1 font-semibold uppercase">Ngân hàng</p>
                                        <p className="text-lg font-bold text-gray-900">{selectedRefund.bankName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1 font-semibold uppercase">Số tài khoản</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-lg font-mono font-bold text-gray-900">{selectedRefund.accountNumber}</p>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(selectedRefund.accountNumber);
                                                    toast.success('Đã sao chép STK');
                                                }}
                                                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                            >
                                                <Copy className="w-4 h-4 text-gray-600" />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1 font-semibold uppercase">Chủ tài khoản</p>
                                        <p className="text-lg font-bold text-gray-900">{selectedRefund.accountHolderName}</p>
                                    </div>
                                    <div className="pt-3 border-t border-gray-200">
                                        <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Số tiền hoàn</p>
                                        <p className="text-3xl font-black text-green-600">
                                            {selectedRefund.refundAmount.toLocaleString('vi-VN')}đ
                                        </p>
                                    </div>
                                </div>

                                {/* QR Code */}
                                {selectedRefund.vietQRUrl && (
                                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-5 space-y-3">
                                        <p className="text-sm font-semibold text-blue-900">Mã QR VietQR</p>
                                        <div className="bg-white rounded-lg p-4 flex justify-center">
                                            <img
                                                src={selectedRefund.vietQRUrl}
                                                alt="VietQR"
                                                className="w-64 h-64 object-contain"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(selectedRefund.vietQRUrl || '');
                                                    toast.success('Đã sao chép link QR');
                                                }}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-blue-300 bg-white hover:bg-blue-50 text-blue-700 font-medium text-sm transition-colors"
                                            >
                                                <Copy className="w-4 h-4" />
                                                Sao chép link
                                            </button>
                                            <a
                                                href={selectedRefund.vietQRUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-blue-300 bg-white hover:bg-blue-50 text-blue-700 font-medium text-sm transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                Mở link
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {/* Instructions */}
                                <div className="rounded-xl bg-orange-50 border border-orange-200 p-4">
                                    <p className="text-sm font-semibold text-orange-900 mb-2">Hướng dẫn:</p>
                                    <ol className="text-xs text-orange-800 space-y-1 list-decimal list-inside">
                                        <li>Quét mã QR bằng ứng dụng ngân hàng của bạn</li>
                                        <li>Xác nhận chuyển tiền hoàn cho khách</li>
                                        <li>Sau khi chuyển thành công, đóng modal này</li>
                                        <li>Bấm nút "Xác nhận đã hoàn" để cập nhật trạng thái</li>
                                    </ol>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSelectedRefund(null)}
                                        className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
                                    >
                                        Đóng
                                    </button>
                                    <button
                                        onClick={() => setConfirmTarget(selectedRefund.id)}
                                        disabled={confirmingId === selectedRefund.id}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-50"
                                    >
                                        {confirmingId === selectedRefund.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                        )}
                                        Xác nhận đã hoàn
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Confirm modal — thay window.confirm */}
            {confirmTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmTarget(null)} />
                    <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-4 flex items-center gap-3 text-white">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            <h3 className="font-bold text-lg">Xác nhận đã hoàn tiền</h3>
                        </div>
                        <div className="px-5 py-5">
                            <p className="text-sm text-gray-700">
                                Bạn xác nhận đã chuyển tiền hoàn lại cho khách thành công?
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                Hành động này không thể hoàn tác. Trạng thái sẽ chuyển sang <strong>Đã hoàn</strong>.
                            </p>
                        </div>
                        <div className="flex gap-3 px-5 pb-5">
                            <button
                                type="button"
                                onClick={() => setConfirmTarget(null)}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={() => handleConfirm(confirmTarget)}
                                disabled={confirmingId === confirmTarget}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                            >
                                {confirmingId === confirmTarget
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <CheckCircle2 className="w-4 h-4" />}
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
