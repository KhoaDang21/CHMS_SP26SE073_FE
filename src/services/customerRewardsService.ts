import { apiService } from './apiService';
import { apiConfig } from '../config/apiConfig';

export interface RewardsBalance {
    availablePoints: number;
    lifetimeEarnedPoints: number;
    lifetimeSpentPoints: number;
}

export interface RewardHistoryItem {
    id: string;
    type: string;          // EARN | SPEND
    points: number;
    description?: string;
    referenceId?: string;
    sourceType?: string;
    displaySubtitle?: string;
    relatedCouponCode?: string;
    createdAt: string;
}

export interface PointsHistoryFilter {
    transactionType?: string;  // EARNED | SPENT | EXPIRED | BONUS
    sourceType?: string;
    fromDate?: string;         // ISO date string
    toDate?: string;
    page?: number;
    pageSize?: number;
}

export interface PointsHistoryResult {
    items: RewardHistoryItem[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface RewardCatalogItem {
    id: string;
    name: string;
    description?: string;
    rewardType: string;    // COUPON | ...
    costPoints: number;
    imageUrl?: string;
    isAvailable?: boolean;
}

export interface RedemptionItem {
    id: string;
    rewardCatalogId: string;
    rewardName: string;
    pointsSpent: number;
    status: string;        // REDEEMED | ISSUED | USED | CANCELLED
    couponId?: string;
    couponCode?: string;
    giftFulfillmentStatus?: string | null;
    redeemedAt: string;
    usedAt?: string | null;
}

export interface CustomerCoupon {
    id: string;
    couponId: string;
    couponCode: string;
    status: string;        // ISSUED | USED | EXPIRED | CANCELLED
    discountPercent?: number;
    maxDiscount?: number;
    expiryDate?: string;
    issuedAt: string;
    usedAt?: string | null;
}

const mapCatalogItem = (item: any): RewardCatalogItem => ({
    id: item?.id ?? '',
    name: item?.name ?? '',
    description: item?.description ?? undefined,
    rewardType: item?.rewardType ?? item?.type ?? '',
    costPoints: item?.costPoints ?? item?.pointCost ?? item?.points ?? 0,
    imageUrl: item?.imageUrl ?? item?.image ?? undefined,
    isAvailable: item?.isAvailable ?? item?.available ?? true,
});

const mapRedemption = (item: any): RedemptionItem => ({
    id: item?.id ?? '',
    rewardCatalogId: item?.rewardCatalogId ?? '',
    rewardName: item?.rewardName ?? item?.name ?? '',
    pointsSpent: item?.pointsSpent ?? item?.points ?? 0,
    status: item?.status ?? '',
    couponId: item?.couponId ?? undefined,
    couponCode: item?.couponCode ?? undefined,
    giftFulfillmentStatus: item?.giftFulfillmentStatus ?? null,
    redeemedAt: item?.redeemedAt ?? item?.createdAt ?? '',
    usedAt: item?.usedAt ?? null,
});

const mapCustomerCoupon = (item: any): CustomerCoupon => ({
    id: item?.id ?? '',
    couponId: item?.couponId ?? '',
    couponCode: item?.couponCode ?? item?.code ?? '',
    status: item?.status ?? '',
    discountPercent: item?.discountPercent ?? item?.discount ?? undefined,
    maxDiscount: item?.maxDiscount ?? undefined,
    expiryDate: item?.expiryDate ?? item?.expiredAt ?? undefined,
    issuedAt: item?.issuedAt ?? item?.createdAt ?? '',
    usedAt: item?.usedAt ?? null,
});

const mapBalance = (data: any): RewardsBalance => ({
    availablePoints: data?.availablePoints ?? data?.available ?? 0,
    lifetimeEarnedPoints: data?.lifetimeEarnedPoints ?? data?.totalEarned ?? 0,
    lifetimeSpentPoints: data?.lifetimeSpentPoints ?? data?.totalSpent ?? 0,
});

const mapHistoryItem = (item: any): RewardHistoryItem => ({
    id: item?.id ?? '',
    type: item?.transactionType ?? item?.type ?? '',
    points: Math.abs(item?.deltaPoints ?? item?.points ?? item?.amount ?? 0),
    description: item?.displayTitle ?? item?.description ?? item?.note ?? undefined,
    referenceId: item?.sourceId ?? item?.experienceBookingId ?? item?.bookingId ?? undefined,
    sourceType: item?.sourceType ?? undefined,
    displaySubtitle: item?.displaySubtitle ?? undefined,
    relatedCouponCode: item?.relatedCouponCode ?? undefined,
    createdAt: item?.createdAt ?? item?.date ?? '',
});

export const customerRewardsService = {
    async getBalance(): Promise<{ success: boolean; data: RewardsBalance; message?: string }> {
        try {
            const res = await apiService.get<any>(apiConfig.endpoints.customerRewards.balance);
            const raw = (res as any)?.data ?? res;
            return {
                success: (res as any)?.success ?? true,
                data: mapBalance(raw),
                message: (res as any)?.message,
            };
        } catch (error) {
            return {
                success: false,
                data: { availablePoints: 0, lifetimeEarnedPoints: 0, lifetimeSpentPoints: 0 },
                message: error instanceof Error ? error.message : 'Không thể tải điểm thưởng',
            };
        }
    },

    async getHistory(): Promise<{ success: boolean; data: RewardHistoryItem[]; message?: string }> {
        try {
            const res = await apiService.get<any>(apiConfig.endpoints.customerRewards.history);
            const raw = (res as any)?.data ?? res;
            const list = Array.isArray(raw)
                ? raw
                : Array.isArray(raw?.items) ? raw.items
                    : Array.isArray(raw?.data) ? raw.data
                        : [];
            return {
                success: (res as any)?.success ?? true,
                data: list.map(mapHistoryItem),
                message: (res as any)?.message,
            };
        } catch {
            return { success: false, data: [], message: 'Không thể tải lịch sử điểm' };
        }
    },

    /** GET /api/customer/rewards/points/history — lịch sử điểm có filter & phân trang */
    async getPointsHistory(filter?: PointsHistoryFilter): Promise<{
        success: boolean;
        data: PointsHistoryResult;
        message?: string;
    }> {
        const empty: PointsHistoryResult = { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 };
        try {
            const params: Record<string, any> = {};
            // Mặc định chỉ lấy EARN (điểm kiếm được)
            params.TransactionType = filter?.transactionType ?? 'EARN';
            if (filter?.sourceType) params.SourceType = filter.sourceType;
            if (filter?.fromDate) params.FromDate = filter.fromDate;
            if (filter?.toDate) params.ToDate = filter.toDate;
            if (filter?.page) params.Page = filter.page;
            if (filter?.pageSize) params.PageSize = filter.pageSize;

            const res = await apiService.get<any>(
                apiConfig.endpoints.customerRewards.pointsHistory,
                Object.keys(params).length ? params : undefined,
            );
            const raw = (res as any)?.data ?? res;

            // unwrap list — BE có thể trả về array thẳng hoặc wrapped
            const list: any[] = Array.isArray(raw) ? raw
                : Array.isArray(raw?.items) ? raw.items
                    : Array.isArray(raw?.data) ? raw.data : [];

            const pagination = raw?.pagination ?? raw?.meta ?? {};

            return {
                success: (res as any)?.success ?? true,
                data: {
                    items: list.map(mapHistoryItem),
                    totalCount: pagination?.totalCount ?? pagination?.total ?? list.length,
                    page: pagination?.currentPage ?? pagination?.page ?? filter?.page ?? 1,
                    pageSize: pagination?.pageSize ?? filter?.pageSize ?? 20,
                    totalPages: pagination?.totalPages ?? pagination?.totalPage ?? Math.ceil((pagination?.totalCount ?? list.length) / (filter?.pageSize ?? 20)),
                },
                message: (res as any)?.message,
            };
        } catch {
            return { success: false, data: empty, message: 'Không thể tải lịch sử điểm' };
        }
    },

    async getCatalog(): Promise<{ success: boolean; data: RewardCatalogItem[]; message?: string }> {
        try {
            const res = await apiService.get<any>(apiConfig.endpoints.customerRewards.catalog);
            const raw = (res as any)?.data ?? res;
            const list = Array.isArray(raw)
                ? raw
                : Array.isArray(raw?.items) ? raw.items
                    : Array.isArray(raw?.data) ? raw.data
                        : [];
            return {
                success: (res as any)?.success ?? true,
                data: list.map(mapCatalogItem),
                message: (res as any)?.message,
            };
        } catch {
            return { success: false, data: [], message: 'Không thể tải danh sách đổi thưởng' };
        }
    },

    async redeemReward(rewardId: string): Promise<{ success: boolean; message?: string; data?: any }> {
        try {
            const res = await apiService.post<any>(
                apiConfig.endpoints.customerRewards.redeem(rewardId),
                {},
            );
            return {
                success: (res as any)?.success ?? true,
                message: (res as any)?.message ?? 'Đổi thưởng thành công!',
                data: (res as any)?.data ?? res,
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Không thể đổi thưởng',
            };
        }
    },

    /** GET /api/customer/rewards/redemptions — lịch sử đổi thưởng */
    async getRedemptions(): Promise<{ success: boolean; data: RedemptionItem[]; message?: string }> {
        try {
            const res = await apiService.get<any>(apiConfig.endpoints.customerRewards.redemptions);
            const raw = (res as any)?.data ?? res;
            const list = Array.isArray(raw) ? raw
                : Array.isArray(raw?.items) ? raw.items
                    : Array.isArray(raw?.data) ? raw.data : [];
            return {
                success: (res as any)?.success ?? true,
                data: list.map(mapRedemption),
                message: (res as any)?.message,
            };
        } catch {
            return { success: false, data: [], message: 'Không thể tải lịch sử đổi thưởng' };
        }
    },

    /** GET /api/customer/rewards/coupons — danh sách coupon customer sở hữu */
    async getMyCoupons(): Promise<{ success: boolean; data: CustomerCoupon[]; message?: string }> {
        try {
            const res = await apiService.get<any>(apiConfig.endpoints.customerRewards.coupons);
            const raw = (res as any)?.data ?? res;
            const list = Array.isArray(raw) ? raw
                : Array.isArray(raw?.items) ? raw.items
                    : Array.isArray(raw?.data) ? raw.data : [];
            return {
                success: (res as any)?.success ?? true,
                data: list.map(mapCustomerCoupon),
                message: (res as any)?.message,
            };
        } catch {
            return { success: false, data: [], message: 'Không thể tải danh sách coupon' };
        }
    },
};
