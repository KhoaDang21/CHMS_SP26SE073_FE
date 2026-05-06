import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2, Clock, Copy, Gift, Loader2, MapPin,
    Sparkles, Tag, TrendingUp, Wallet, XCircle,
    ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/authService';
import {
    customerRewardsService,
    type RewardsBalance,
    type RewardCatalogItem,
    type RedemptionItem,
    type CustomerCoupon,
    type PointsHistoryFilter,
    type PointsHistoryResult,
} from '../../services/customerRewardsService';
import AccountLayout from '../../layouts/AccountLayout';

// ── helpers ───────────────────────────────────────────────────────────────────
const HISTORY_TYPE: Record<string, { label: string; color: string; sign: string }> = {
    EARN: { label: 'Tích điểm', color: 'text-green-600', sign: '+' },
    EARNED: { label: 'Tích điểm', color: 'text-green-600', sign: '+' },
    SPEND: { label: 'Dùng điểm', color: 'text-red-500', sign: '-' },
    SPENT: { label: 'Dùng điểm', color: 'text-red-500', sign: '-' },
    EXPIRED: { label: 'Hết hạn', color: 'text-gray-400', sign: '-' },
    BONUS: { label: 'Thưởng', color: 'text-blue-600', sign: '+' },
};
const getHistoryType = (type: string) =>
    HISTORY_TYPE[type?.toUpperCase()] ?? { label: type || '—', color: 'text-green-600', sign: '+' };

const REDEMPTION_STATUS: Record<string, { label: string; cls: string }> = {
    ISSUED: { label: 'Đã phát hành', cls: 'bg-green-50 text-green-700 border-green-200' },
    REDEEMED: { label: 'Đã đổi', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    USED: { label: 'Đã dùng', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
    CANCELLED: { label: 'Đã hủy', cls: 'bg-red-50 text-red-500 border-red-200' },
};
const getRedemptionStatus = (s: string) =>
    REDEMPTION_STATUS[s?.toUpperCase()] ?? { label: s || '—', cls: 'bg-gray-100 text-gray-500 border-gray-200' };

const COUPON_STATUS: Record<string, { label: string; cls: string }> = {
    ISSUED: { label: 'Còn dùng được', cls: 'bg-green-50 text-green-700 border-green-200' },
    USED: { label: 'Đã sử dụng', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
    EXPIRED: { label: 'Hết hạn', cls: 'bg-orange-50 text-orange-600 border-orange-200' },
    CANCELLED: { label: 'Đã hủy', cls: 'bg-red-50 text-red-500 border-red-200' },
};
const getCouponStatus = (s: string) =>
    COUPON_STATUS[s?.toUpperCase()] ?? { label: s || '—', cls: 'bg-gray-100 text-gray-500 border-gray-200' };

const isUsableCoupon = (c: CustomerCoupon) =>
    c.status?.toUpperCase() === 'ISSUED' &&
    (!c.expiryDate || new Date(c.expiryDate) > new Date());

const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
};

const formatDateTime = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

type TabKey = 'catalog' | 'coupons' | 'redemptions' | 'history';
// ─────────────────────────────────────────────────────────────────────────────

export default function RewardsPage() {
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();

    const [activeTab, setActiveTab] = useState<TabKey>('catalog');
    const [balance, setBalance] = useState<RewardsBalance | null>(null);
    const [catalog, setCatalog] = useState<RewardCatalogItem[]>([]);
    const [redemptions, setRedemptions] = useState<RedemptionItem[]>([]);
    const [coupons, setCoupons] = useState<CustomerCoupon[]>([]);

    const [balanceLoading, setBalanceLoading] = useState(true);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [redemptionsLoading, setRedemptionsLoading] = useState(false);
    const [couponsLoading, setCouponsLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [redeemingId, setRedeemingId] = useState<string | null>(null);

    // history filter state
    const [historyFilter, setHistoryFilter] = useState<PointsHistoryFilter>({ page: 1, pageSize: 20 });
    const [historyResult, setHistoryResult] = useState<PointsHistoryResult>({
        items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0,
    });

    useEffect(() => {
        if (!currentUser) { navigate('/auth/login'); return; }
        void loadBalance();
        void loadCatalog();
        void loadCoupons();
        void loadRedemptions();
        void loadHistory();
    }, []);

    const loadBalance = async () => {
        setBalanceLoading(true);
        try {
            const r = await customerRewardsService.getBalance();
            if (r.success) setBalance(r.data);
            else toast.error(r.message || 'Không thể tải điểm thưởng');
        } finally { setBalanceLoading(false); }
    };

    const loadCatalog = async () => {
        setCatalogLoading(true);
        try {
            const r = await customerRewardsService.getCatalog();
            if (r.success) setCatalog(r.data);
        } finally { setCatalogLoading(false); }
    };

    const loadRedemptions = async () => {
        setRedemptionsLoading(true);
        try {
            const r = await customerRewardsService.getRedemptions();
            if (r.success) setRedemptions(r.data);
        } finally { setRedemptionsLoading(false); }
    };

    const loadCoupons = async () => {
        setCouponsLoading(true);
        try {
            const r = await customerRewardsService.getMyCoupons();
            if (r.success) setCoupons(r.data);
        } finally { setCouponsLoading(false); }
    };

    const loadHistory = async (filter?: PointsHistoryFilter) => {
        const f = filter ?? historyFilter;
        setHistoryLoading(true);
        try {
            const r = await customerRewardsService.getPointsHistory(f);
            if (r.success) setHistoryResult(r.data);
            else toast.error(r.message || 'Không thể tải lịch sử điểm');
        } finally { setHistoryLoading(false); }
    };

    const canAfford = (cost: number) => (balance?.availablePoints ?? 0) >= cost;

    const handleRedeem = async (item: RewardCatalogItem) => {
        if (!canAfford(item.costPoints)) return;
        if (!window.confirm(`Đổi "${item.name}" với ${item.costPoints.toLocaleString('vi-VN')} điểm?`)) return;
        setRedeemingId(item.id);
        try {
            const result = await customerRewardsService.redeemReward(item.id);
            if (result.success) {
                toast.success(result.message || 'Đổi thưởng thành công!');
                await Promise.all([loadBalance(), loadRedemptions(), loadCoupons(), loadHistory()]);
            } else {
                toast.error(result.message || 'Không thể đổi thưởng');
            }
        } catch {
            toast.error('Không thể đổi thưởng');
        } finally {
            setRedeemingId(null);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code).then(() => toast.success(`Đã sao chép: ${code}`));
    };

    const tabs: { key: TabKey; label: string; badge?: number }[] = [
        { key: 'catalog', label: 'Đổi điểm', badge: catalog.length },
        { key: 'coupons', label: 'Coupon của tôi', badge: coupons.filter(isUsableCoupon).length },
        { key: 'redemptions', label: 'Lịch sử đổi thưởng' },
        { key: 'history', label: 'Lịch sử điểm' },
    ];

    return (
        <AccountLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-yellow-500" />
                        Điểm thưởng
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Tích điểm từ check-in hidden gems và đổi lấy coupon ưu đãi
                    </p>
                </div>

                {/* Balance cards */}
                {balanceLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : balance ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 text-white shadow-md">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-blue-100">Điểm khả dụng</p>
                                <Wallet className="w-5 h-5 text-blue-200" />
                            </div>
                            <p className="text-4xl font-bold">{balance.availablePoints.toLocaleString('vi-VN')}</p>
                            <p className="text-xs text-blue-200 mt-1">điểm</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-500">Tổng đã tích lũy</p>
                                <TrendingUp className="w-5 h-5 text-green-500" />
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{balance.lifetimeEarnedPoints.toLocaleString('vi-VN')}</p>
                            <p className="text-xs text-gray-400 mt-1">điểm</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-500">Tổng đã dùng</p>
                                <MapPin className="w-5 h-5 text-orange-400" />
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{balance.lifetimeSpentPoints.toLocaleString('vi-VN')}</p>
                            <p className="text-xs text-gray-400 mt-1">điểm</p>
                        </div>
                    </div>
                ) : null}

                {/* Info banner */}
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800 flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-cyan-600" />
                    <span>
                        Điểm thưởng được tích lũy khi bạn check-in tại các <strong>hidden gems</strong> trong
                        lịch trình tour địa phương. Dùng điểm để đổi lấy coupon giảm giá.
                    </span>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1.5 flex gap-1 flex-wrap">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 min-w-fit px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${activeTab === tab.key
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {tab.label}
                            {tab.badge !== undefined && tab.badge > 0 && (
                                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${activeTab === tab.key ? 'bg-white/30 text-white' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Tab: Đổi điểm ── */}
                {activeTab === 'catalog' && (
                    catalogLoading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
                    ) : catalog.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
                            <Gift className="w-10 h-10 opacity-30" />
                            <p className="text-sm">Chưa có coupon nào để đổi</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {catalog.map((item) => {
                                const affordable = canAfford(item.costPoints);
                                const isRedeeming = redeemingId === item.id;
                                return (
                                    <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${affordable ? 'border-gray-200 hover:shadow-md' : 'border-gray-100 opacity-60'}`}>
                                        <div className={`h-1 w-full ${affordable ? 'bg-gradient-to-r from-blue-400 to-cyan-400' : 'bg-gray-200'}`} />
                                        <div className="p-4 flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${affordable ? 'bg-gradient-to-br from-blue-50 to-cyan-50' : 'bg-gray-100'}`}>
                                                {item.imageUrl
                                                    ? <img src={item.imageUrl} alt={item.name} className="w-8 h-8 object-contain" />
                                                    : <Tag className={`w-6 h-6 ${affordable ? 'text-cyan-500' : 'text-gray-400'}`} />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                                                {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
                                                <span className={`inline-flex items-center gap-1 text-sm font-bold mt-2 ${affordable ? 'text-blue-600' : 'text-gray-400'}`}>
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    {item.costPoints.toLocaleString('vi-VN')} điểm
                                                </span>
                                            </div>
                                        </div>
                                        <div className="px-4 pb-4">
                                            <button
                                                type="button"
                                                onClick={() => void handleRedeem(item)}
                                                disabled={!affordable || isRedeeming}
                                                className={`w-full py-2 rounded-xl text-sm font-semibold transition-all ${affordable ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 disabled:opacity-60' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                            >
                                                {isRedeeming ? (
                                                    <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Đang đổi...</span>
                                                ) : affordable ? 'Đổi ngay'
                                                    : `Cần thêm ${(item.costPoints - (balance?.availablePoints ?? 0)).toLocaleString('vi-VN')} điểm`
                                                }
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}

                {/* ── Tab: Coupon của tôi ── */}
                {activeTab === 'coupons' && (
                    couponsLoading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
                    ) : coupons.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
                            <Tag className="w-10 h-10 opacity-30" />
                            <p className="text-sm">Bạn chưa có coupon nào</p>
                            <button type="button" onClick={() => setActiveTab('catalog')} className="text-xs text-cyan-600 hover:underline">
                                Đổi điểm lấy coupon ngay
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {coupons.map((c) => {
                                const cfg = getCouponStatus(c.status);
                                const usable = isUsableCoupon(c);
                                return (
                                    <div key={c.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${usable ? 'border-gray-200' : 'border-gray-100 opacity-70'}`}>
                                        <div className={`h-1 w-full ${usable ? 'bg-gradient-to-r from-green-400 to-emerald-400' : 'bg-gray-200'}`} />
                                        <div className="p-4 flex items-center gap-4">
                                            {/* Code block */}
                                            <div className={`flex-shrink-0 rounded-xl px-4 py-3 text-center min-w-[120px] ${usable ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border border-cyan-200' : 'bg-gray-100 border border-gray-200'}`}>
                                                <p className={`text-lg font-bold tracking-widest ${usable ? 'text-blue-700' : 'text-gray-400'}`}>
                                                    {c.couponCode || '—'}
                                                </p>
                                                {c.discountPercent !== undefined && (
                                                    <p className={`text-xs font-semibold mt-0.5 ${usable ? 'text-cyan-600' : 'text-gray-400'}`}>
                                                        Giảm {c.discountPercent}%
                                                    </p>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}>
                                                        {cfg.label}
                                                    </span>
                                                    {c.maxDiscount !== undefined && (
                                                        <span className="text-xs text-gray-500">Tối đa {c.maxDiscount.toLocaleString('vi-VN')}đ</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Phát hành: {formatDate(c.issuedAt)}
                                                    </span>
                                                    {c.expiryDate && (
                                                        <span className={`flex items-center gap-1 ${!usable && c.status?.toUpperCase() === 'EXPIRED' ? 'text-orange-500' : ''}`}>
                                                            <XCircle className="w-3 h-3" />
                                                            Hết hạn: {formatDate(c.expiryDate)}
                                                        </span>
                                                    )}
                                                    {c.usedAt && (
                                                        <span className="flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                            Đã dùng: {formatDate(c.usedAt)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Copy button */}
                                            {usable && c.couponCode && (
                                                <button
                                                    type="button"
                                                    onClick={() => copyCode(c.couponCode)}
                                                    className="flex-shrink-0 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-blue-600 transition-colors"
                                                    title="Sao chép mã"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}

                {/* ── Tab: Lịch sử đổi thưởng ── */}
                {activeTab === 'redemptions' && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-900">Lịch sử đổi thưởng</h2>
                        </div>
                        {redemptionsLoading ? (
                            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
                        ) : redemptions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 gap-2 text-gray-400">
                                <Gift className="w-10 h-10 opacity-30" />
                                <p className="text-sm">Chưa có lịch sử đổi thưởng</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {redemptions.map((r) => {
                                    const cfg = getRedemptionStatus(r.status);
                                    return (
                                        <div key={r.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">{r.rewardName}</p>
                                                    {r.couponCode && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-gray-500">Mã:</span>
                                                            <span className="text-xs font-bold text-blue-600 tracking-wider">{r.couponCode}</span>
                                                            <button type="button" onClick={() => copyCode(r.couponCode!)} className="text-gray-400 hover:text-blue-500">
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-gray-400 mt-1">Ngày đổi: {formatDateTime(r.redeemedAt)}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}>
                                                        {cfg.label}
                                                    </span>
                                                    <span className="text-sm font-bold text-red-500">
                                                        -{r.pointsSpent.toLocaleString('vi-VN')} điểm
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Lịch sử điểm ── */}
                {activeTab === 'history' && (
                    <div className="space-y-3">
                        {/* Result */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="font-semibold text-gray-900">Lịch sử điểm</h2>
                                {historyResult.totalCount > 0 && (
                                    <span className="text-xs text-gray-400">{historyResult.totalCount} giao dịch</span>
                                )}
                            </div>

                            {historyLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                                </div>
                            ) : historyResult.items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-14 gap-2 text-gray-400">
                                    <Sparkles className="w-10 h-10 opacity-30" />
                                    <p className="text-sm">Không có giao dịch nào</p>
                                    <p className="text-xs">Tham gia tour địa phương và check-in hidden gems để tích điểm!</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {historyResult.items.map((item) => {
                                        const cfg = getHistoryType(item.type);
                                        return (
                                            <div key={item.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.sign === '+' ? 'bg-green-100' : 'bg-red-50'}`}>
                                                        <Sparkles className={`w-4 h-4 ${cfg.color}`} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{item.description || cfg.label}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <p className="text-xs text-gray-400">{formatDateTime(item.createdAt)}</p>
                                                            {item.sourceType && (
                                                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{item.sourceType}</span>
                                                            )}
                                                        </div>
                                                        {item.displaySubtitle && (
                                                            <p className="text-xs text-gray-400 mt-0.5 truncate">{item.displaySubtitle}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={`text-sm font-bold flex-shrink-0 ml-4 ${cfg.color}`}>
                                                    {cfg.sign}{item.points.toLocaleString('vi-VN')} điểm
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Pagination */}
                            {historyResult.totalPages > 1 && (
                                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                                    <span className="text-xs text-gray-400">
                                        Trang {historyResult.page}/{historyResult.totalPages}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            disabled={historyResult.page <= 1 || historyLoading}
                                            onClick={() => {
                                                const f = { ...historyFilter, page: historyResult.page - 1 };
                                                setHistoryFilter(f);
                                                void loadHistory(f);
                                            }}
                                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                                        >
                                            <ChevronLeft className="w-4 h-4 text-gray-500" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={historyResult.page >= historyResult.totalPages || historyLoading}
                                            onClick={() => {
                                                const f = { ...historyFilter, page: historyResult.page + 1 };
                                                setHistoryFilter(f);
                                                void loadHistory(f);
                                            }}
                                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                                        >
                                            <ChevronRight className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AccountLayout>
    );
}
