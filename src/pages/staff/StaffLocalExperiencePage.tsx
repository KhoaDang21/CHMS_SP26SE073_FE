import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    MapPin,
    Menu,
    PlayCircle,
    RefreshCw,
    Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/authService';
import {
    staffExperienceService,
    type StaffAssignedSchedule,
} from '../../services/staffExperienceService';
import StaffSidebar from '../../components/staff/StaffSidebar';
import BackofficeNotificationBell from '../../components/common/BackofficeNotificationBell';

// ── helpers ───────────────────────────────────────────────────────────────────
const toDateStr = (d: Date) => d.toISOString().split('T')[0];

const formatDateHeader = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('vi-VN', {
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    });
};

const STATUS_CONFIG: Record<string, { label: string; bar: string; badge: string }> = {
    PENDING: { label: 'Chờ bắt đầu', bar: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    PLANNED: { label: 'Đã lên kế hoạch', bar: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    IN_PROGRESS: { label: 'Đang diễn ra', bar: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    COMPLETED: { label: 'Hoàn thành', bar: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200' },
    CANCELLED: { label: 'Đã hủy', bar: 'bg-red-400', badge: 'bg-red-50 text-red-700 border-red-200' },
};

const getStatus = (status: string) =>
    STATUS_CONFIG[status?.toUpperCase()] ??
    { label: status || '—', bar: 'bg-gray-300', badge: 'bg-gray-100 text-gray-600 border-gray-200' };
// ─────────────────────────────────────────────────────────────────────────────

export default function StaffLocalExperiencePage() {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>(toDateStr(new Date()));
    const [schedules, setSchedules] = useState<StaffAssignedSchedule[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const handleLogout = () => {
        authService.logout();
        navigate('/auth/login');
    };

    // ── load ──────────────────────────────────────────────────────────────────
    const loadSchedules = useCallback(async (date: string) => {
        setLoading(true);
        try {
            const result = await staffExperienceService.getAssigned(date);
            if (result.success) {
                setSchedules(result.data);
            } else {
                toast.error(result.message || 'Không thể tải lịch phân công');
                setSchedules([]);
            }
        } catch {
            toast.error('Không thể tải lịch phân công');
            setSchedules([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSchedules(selectedDate);
    }, [selectedDate, loadSchedules]);

    // ── date navigation ───────────────────────────────────────────────────────
    const shiftDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(toDateStr(d));
    };

    const isToday = selectedDate === toDateStr(new Date());

    // ── start ─────────────────────────────────────────────────────────────────
    const handleStart = async (schedule: StaffAssignedSchedule) => {
        if (!window.confirm(`Bắt đầu tour "${schedule.localExperienceName}"?`)) return;
        setActionLoading(schedule.scheduleId);
        try {
            const result = await staffExperienceService.startSchedule(schedule.scheduleId);
            if (result.success) {
                toast.success(result.message || 'Đã bắt đầu tour!');
                setSchedules((prev) =>
                    prev.map((s) =>
                        s.scheduleId === schedule.scheduleId
                            ? { ...s, status: result.data?.status ?? 'IN_PROGRESS' }
                            : s,
                    ),
                );
            } else {
                toast.error(result.message || 'Không thể bắt đầu tour');
            }
        } catch {
            toast.error('Không thể bắt đầu tour');
        } finally {
            setActionLoading(null);
        }
    };

    // ── complete ──────────────────────────────────────────────────────────────
    const handleComplete = async (schedule: StaffAssignedSchedule) => {
        if (!window.confirm(`Kết thúc tour "${schedule.localExperienceName}"?`)) return;
        setActionLoading(schedule.scheduleId);
        try {
            const result = await staffExperienceService.completeSchedule(schedule.scheduleId);
            if (result.success) {
                toast.success(result.message || 'Tour đã hoàn thành!');
                setSchedules((prev) =>
                    prev.map((s) =>
                        s.scheduleId === schedule.scheduleId
                            ? { ...s, status: result.data?.status ?? 'COMPLETED' }
                            : s,
                    ),
                );
            } else {
                toast.error(result.message || 'Không thể kết thúc tour');
            }
        } catch {
            toast.error('Không thể kết thúc tour');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <StaffSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                currentPath="/staff/local-experience"
                userName={user?.name}
                userRole={user?.role || 'staff'}
                onLogout={handleLogout}
            />

            <div className="flex-1 lg:ml-64">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                                type="button"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Lịch dẫn tour</h2>
                                <p className="text-sm text-gray-500">Lịch trình local experience được phân công</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <BackofficeNotificationBell />
                            <button
                                onClick={() => void loadSchedules(selectedDate)}
                                disabled={loading}
                                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                                title="Làm mới"
                                type="button"
                            >
                                <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="p-6 max-w-3xl mx-auto space-y-5">
                    {/* Date picker card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => shiftDate(-1)}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div className="flex-1 text-center">
                                <p className="text-base font-semibold text-gray-900">
                                    {formatDateHeader(selectedDate)}
                                </p>
                                {isToday && (
                                    <span className="text-xs text-cyan-600 font-medium">Hôm nay</span>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => shiftDate(1)}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mt-3 flex justify-center">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                    </div>

                    {/* Schedule list */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm">Đang tải lịch phân công...</p>
                        </div>
                    ) : schedules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
                            <Calendar className="w-12 h-12 opacity-30" />
                            <p className="text-sm font-medium">Không có lịch dẫn tour nào vào ngày này</p>
                            {!isToday && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedDate(toDateStr(new Date()))}
                                    className="text-xs text-cyan-600 hover:underline"
                                >
                                    Về hôm nay
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-500 font-medium px-1">
                                {schedules.length} lịch trình được phân công
                            </p>

                            {schedules.map((schedule) => {
                                const cfg = getStatus(schedule.status);
                                const isActioning = actionLoading === schedule.scheduleId;
                                const statusUp = schedule.status?.toUpperCase();
                                const canStart = !statusUp || statusUp === 'PENDING' || statusUp === 'PLANNED';
                                const canComplete = statusUp === 'IN_PROGRESS';
                                const isDone = statusUp === 'COMPLETED' || statusUp === 'CANCELLED';

                                return (
                                    <div
                                        key={schedule.scheduleId}
                                        className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                                    >
                                        {/* Status bar */}
                                        <div className={`h-1 w-full ${cfg.bar}`} />

                                        <div className="p-5 space-y-3">
                                            {/* Title + badge */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-gray-900 text-base leading-snug truncate">
                                                        {schedule.localExperienceName || 'Tour chưa đặt tên'}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mt-0.5 truncate">
                                                        {schedule.homestayName}
                                                    </p>
                                                </div>
                                                <span className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                                                    {cfg.label}
                                                </span>
                                            </div>

                                            {/* Info row */}
                                            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-600">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                    {schedule.startTime || '—'} – {schedule.endTime || '—'}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Users className="w-3.5 h-3.5 text-gray-400" />
                                                    {schedule.currentQuantity}/{schedule.maxQuantity} người
                                                </span>
                                                {schedule.meetingPoint && (
                                                    <span className="flex items-center gap-1.5 w-full">
                                                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                        <span className="truncate">{schedule.meetingPoint}</span>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Plan note */}
                                            {schedule.planNote && (
                                                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                                                    📋 {schedule.planNote}
                                                </div>
                                            )}

                                            {/* ID */}
                                            <p className="text-xs text-gray-400">
                                                ID: {schedule.scheduleId.slice(0, 16)}…
                                            </p>

                                            {/* Action buttons */}
                                            {!isDone && (
                                                <div className="flex gap-2 pt-2 border-t border-gray-100">
                                                    {canStart && (
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleStart(schedule)}
                                                            disabled={isActioning}
                                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 transition-colors"
                                                        >
                                                            <PlayCircle className="w-4 h-4" />
                                                            {isActioning ? 'Đang xử lý...' : 'Bắt đầu tour'}
                                                        </button>
                                                    )}
                                                    {canComplete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleComplete(schedule)}
                                                            disabled={isActioning}
                                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            {isActioning ? 'Đang xử lý...' : 'Kết thúc tour'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {isDone && (
                                                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-sm text-gray-400">
                                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                    Tour đã hoàn tất
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
