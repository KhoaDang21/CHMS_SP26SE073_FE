import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Menu, PlayCircle, CheckSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { employeeService } from '../../services/employeeService';
import { homestayService } from '../../services/homestayService';
import { facilityService } from '../../services/facilityService';
import StaffSidebar from '../../components/staff/StaffSidebar';
import type { FacilityCondition, MaintenanceRequest, MaintenanceStatus } from '../../types/facility.types';
import { FACILITY_CONDITION_OPTIONS, MAINTENANCE_STATUS_OPTIONS, PRIORITY_LEVEL_OPTIONS, DAMAGE_LEVEL_OPTIONS } from '../../types/facility.types';

const normalizeMaintenanceStatus = (value?: string): MaintenanceStatus => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (raw === 'ASSIGNED' || raw === 'IN_PROGRESS' || raw === 'COMPLETED' || raw === 'CANCELLED') return raw;
  return 'PENDING';
};

export default function StaffFacilitiesPage() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [homestays, setHomestays] = useState<Array<{ id: string; name: string }>>([]);
  const [homestayId, setHomestayId] = useState('');
  const [assignedHomestayIds, setAssignedHomestayIds] = useState<string[] | null>(null);
  const [items, setItems] = useState<MaintenanceRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | MaintenanceStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeItem, setActiveItem] = useState<MaintenanceRequest | null>(null);
  const [startItem, setStartItem] = useState<MaintenanceRequest | null>(null);
  const [completeActualCost, setCompleteActualCost] = useState('');
  const [completeFacilityCondition, setCompleteFacilityCondition] = useState<FacilityCondition>('GOOD');
  const [completeEvidenceFile, setCompleteEvidenceFile] = useState<File | null>(null);
  const [completeEvidenceUrl, setCompleteEvidenceUrl] = useState('');
  const [startEvidenceFile, setStartEvidenceFile] = useState<File | null>(null);
  const [startEvidenceUrl, setStartEvidenceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<MaintenanceRequest[]>([]);

  const selectedHomestay = useMemo(
    () => homestays.find((item) => item.id === homestayId),
    [homestays, homestayId],
  );

  const loadMaintenance = async () => {
    // Load all maintenance items available to this staff user, then filter on the client.
    setLoading(true);
    try {
      const list = await facilityService.staffGetMaintenance();
      setItems(list);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách bảo trì');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        if (user?.role === 'staff' && user.id) {
          const emp = await employeeService.getEmployeeById(user.id);
          const rawAssignments = (emp?.assignedHomestays ?? emp?.assignedHomestayIds ?? []) as Array<
            string | { id?: string; homestayId?: string; name?: string; homestayName?: string }
          >;

          const normalizedIds = rawAssignments
            .map((item) => {
              if (typeof item === 'string') return item;
              return String(item?.id ?? item?.homestayId ?? '').trim();
            })
            .filter(Boolean);

          if (normalizedIds.length > 0) {
            setAssignedHomestayIds(normalizedIds);
            const homes = await Promise.all(normalizedIds.map((id) => homestayService.getAdminHomestayById(id)));
            const validHomes = homes.filter(Boolean) as any[];
            const mappedHomes = validHomes.map((home) => ({ id: String(home.id), name: home.name }));
            setHomestays(mappedHomes);
            setHomestayId((current) => current || mappedHomes[0]?.id || normalizedIds[0]);
          } else {
            setHomestays([]);
            setAssignedHomestayIds([]);
          }
        }
      } catch (error) {
        console.error('Error loading staff assignments', error);
        toast.error('Không thể tải danh sách homestay được giao');
      }
    };

    init();
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!homestayId) return;
    loadMaintenance();
  }, [homestayId, assignedHomestayIds]);

  const filteredItems = useMemo(() => {
    const allowedHomestayIds = new Set((assignedHomestayIds ?? []).map(String));
    return items.filter((item) => {
      const status = normalizeMaintenanceStatus(item.status);
      const matchesStatus = filterStatus === 'all' || status === filterStatus;
      const itemHomestayId = String(item.homestayId ?? '');
      const isAssignedHomestay = allowedHomestayIds.size === 0 || allowedHomestayIds.has(itemHomestayId);
      const matchesHomestay = homestayId === 'all' || itemHomestayId === homestayId;
      const searchableText = [
        item.title,
        item.description,
        item.facilityAssetName,
        item.homestayName,
        item.reportedByUserName,
        item.assignedStaffName,
        item.facilityAssetId,
        item.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch =
        searchableText.includes(searchTerm.toLowerCase());
      return isAssignedHomestay && matchesHomestay && matchesStatus && matchesSearch;
    });
  }, [assignedHomestayIds, homestayId, items, filterStatus, searchTerm]);

  const pendingMaintenanceCount = useMemo(
    () => items.filter((item) => normalizeMaintenanceStatus(item.status) === 'PENDING').length,
    [items],
  );
  const handleStart = async (id: string, shouldOpenModal = true) => {
    const task = items.find((item) => item.id === id) || pendingTasks.find((item) => item.id === id) || null;
    if (shouldOpenModal && task) {
      setStartItem(task);
      setStartEvidenceFile(null);
      setStartEvidenceUrl('');
      return;
    }

    setIsSubmitting(true);
    try {
      await facilityService.staffStartMaintenance(id);
      await facilityService.staffUploadMaintenanceEvidence(id, {
        imageFile: startEvidenceFile,
        imageUrl: startEvidenceUrl,
      });
      toast.success('Đã nhận bảo trì');
      await loadMaintenance();
    } catch (error) {
      console.error(error);
      toast.error('Không thể bắt đầu bảo trì');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCompleteModal = (item: MaintenanceRequest) => {
    setActiveItem(item);
    setCompleteActualCost(String(item.actualCost ?? item.estimatedCost ?? ''));
    setCompleteFacilityCondition(item.facilityConditionStatus ?? 'GOOD');
    setCompleteEvidenceFile(null);
    setCompleteEvidenceUrl('');
  };

  const handleComplete = async () => {
    if (!activeItem) return;
    setIsSubmitting(true);
    try {
      await facilityService.staffCompleteMaintenance(activeItem.id, {
        actualCost: completeActualCost ? Number(completeActualCost) : undefined,
        facilityConditionStatus: completeFacilityCondition,
      });
      await facilityService.staffUploadMaintenanceEvidence(activeItem.id, {
        imageFile: completeEvidenceFile,
        imageUrl: completeEvidenceUrl,
      });
      toast.success('Đã hoàn tất bảo trì');
      setActiveItem(null);
      await loadMaintenance();
    } catch (error) {
      console.error(error);
      toast.error('Không thể hoàn tất bảo trì');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  const handleOpenAcceptModal = async () => {
    try {
      if (Array.isArray(assignedHomestayIds) && assignedHomestayIds.length > 0) {
        const allowedHomestayIds = new Set(assignedHomestayIds.map(String));
        const pendingOnly = items.filter((t) => {
          const itemHomestayId = String(t.homestayId ?? '');
          return allowedHomestayIds.has(itemHomestayId) && normalizeMaintenanceStatus(t.status) === 'PENDING';
        });
        setPendingTasks(pendingOnly);
        setShowAcceptModal(true);
      } else {
        toast.info('Chưa có homestay được giao');
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách công việc');
    }
  };

  const handleAcceptTaskFromModal = async (id: string) => {
    await handleStart(id, false);
    // Reload pending tasks after accepting
    const updatedTasks = pendingTasks.filter((t) => t.id !== id);
    setPendingTasks(updatedTasks);
    if (updatedTasks.length === 0) {
      setShowAcceptModal(false);
      toast.success('Tất cả công việc đã được nhận!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <StaffSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPath="/staff/facilities"
        userName={user?.name}
        userRole={user?.role || 'staff'}
        onLogout={handleLogout}
      />

      <div className={`transition-all ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bảo trì homestay</h1>
                <p className="text-sm text-gray-500">Chỉ hiển thị homestay bạn được giao</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600">
                {selectedHomestay ? `Homestay: ${selectedHomestay.name}` : 'Chưa có homestay được giao'}
              </div>
              <button
                type="button"
                onClick={handleOpenAcceptModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium relative"
              >
                <PlayCircle className="w-5 h-5" />
                <span>Tiếp nhận bảo trì</span>
                {pendingMaintenanceCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                    {pendingMaintenanceCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <AlertCircle className="h-4 w-4" /> Danh sách bảo trì
                </div>
                <h2 className="mt-3 text-xl font-bold text-slate-900">Công việc bảo trì theo homestay</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Staff chỉ nhìn thấy các công việc của homestay được giao và có thể nhận, bắt đầu hoặc hoàn tất bảo trì.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Homestay</label>
                  <select
                    value={homestayId}
                    onChange={(e) => setHomestayId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                      <option value="all">Tất cả</option>
                      {homestays.length === 0 ? (
                        <option value="">Chưa có homestay</option>
                      ) : (
                        homestays.map((homestay) => (
                          <option key={homestay.id} value={homestay.id}>{homestay.name}</option>
                        ))
                      )}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Trạng thái</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="all">Tất cả</option>
                    {MAINTENANCE_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Tìm kiếm</label>
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tên công việc, mô tả, ID tài sản"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            {loading ? (
              <div className="py-16 text-center text-slate-600">Đang tải...</div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center text-slate-600">
                Không có công việc bảo trì phù hợp.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => {
                  const status = normalizeMaintenanceStatus(item.status);
                  const statusLabel = MAINTENANCE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
                  return (
                    <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.homestayName || 'Homestay chưa rõ'}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {statusLabel}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <div><span className="font-medium">Tài sản:</span> {item.facilityAssetName || 'Không rõ'}</div>
                        {item.reportedByUserName && <div><span className="font-medium">Người báo:</span> {item.reportedByUserName}</div>}
                        {item.description && <div><span className="font-medium">Mô tả:</span> {item.description}</div>}
                          {item.priority && <div><span className="font-medium">Độ ưu tiên:</span> {PRIORITY_LEVEL_OPTIONS.find((o) => o.value === item.priority)?.label ?? item.priority}</div>}
                          {item.damageLevel && <div><span className="font-medium">Mức độ hư hỏng:</span> {DAMAGE_LEVEL_OPTIONS.find((o) => o.value === item.damageLevel)?.label ?? item.damageLevel}</div>}
                        {item.assignedStaffName ? (
                          <div><span className="font-medium">Nhân viên:</span> {item.assignedStaffName}</div>
                        ) : null}
                        {item.estimatedCost !== undefined && <div><span className="font-medium">Chi phí dự kiến:</span> {item.estimatedCost}</div>}
                        {item.actualCost !== null && item.actualCost !== undefined && <div><span className="font-medium">Chi phí thực tế:</span> {item.actualCost}</div>}
                          {item.facilityConditionStatus && <div><span className="font-medium">Tình trạng sau xử lý:</span> {FACILITY_CONDITION_OPTIONS.find((o) => o.value === item.facilityConditionStatus)?.label ?? item.facilityConditionStatus}</div>}

                        {(((item as any).evidenceImageUrls && (item as any).evidenceImageUrls.length) || item.evidenceImageUrl) && (
                          <div className="mt-2 flex items-center gap-2">
                            {(((item as any).evidenceImageUrls && (item as any).evidenceImageUrls.length ? (item as any).evidenceImageUrls : (item.evidenceImageUrl ? [item.evidenceImageUrl] : [])) as string[])
                              .slice(0, 3)
                              .map((url, idx) => (
                                <img key={idx} src={url} alt={`evidence-${idx}`} className="h-12 w-12 rounded-md object-cover border" />
                              ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {status === 'PENDING' && (
                          <button
                            onClick={() => handleStart(item.id)}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                          >
                            <PlayCircle className="h-4 w-4" /> Nhận việc
                          </button>
                        )}
                        {status === 'ASSIGNED' && (
                          <button
                            onClick={() => handleStart(item.id)}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                          >
                            <PlayCircle className="h-4 w-4" /> Bắt đầu
                          </button>
                        )}
                        {status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => openCompleteModal(item)}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Hoàn tất
                          </button>
                        )}
                        <button
                          onClick={() => loadMaintenance()}
                          className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                        >
                          <Clock3 className="h-4 w-4" /> Tải lại
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Hoàn tất bảo trì</h3>
            <p className="mt-1 text-sm text-slate-600">Công việc: {activeItem.title}</p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Chi phí thực tế</label>
                <input
                  type="number"
                  value={completeActualCost}
                  onChange={(e) => setCompleteActualCost(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tình trạng tài sản sau xử lý</label>
                <select
                  value={completeFacilityCondition}
                  onChange={(e) => setCompleteFacilityCondition(e.target.value as FacilityCondition)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  {FACILITY_CONDITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Ảnh báo cáo hoàn tất</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCompleteEvidenceFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <input
                  value={completeEvidenceUrl}
                  onChange={(e) => setCompleteEvidenceUrl(e.target.value)}
                  placeholder="Hoặc dán link ảnh"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setActiveItem(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <CheckSquare className="h-4 w-4" /> Xác nhận hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {startItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Bắt đầu bảo trì</h3>
            <p className="mt-1 text-sm text-slate-600">Công việc: {startItem.title}</p>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Ảnh báo cáo lúc bắt đầu</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setStartEvidenceFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <input
                  value={startEvidenceUrl}
                  onChange={(e) => setStartEvidenceUrl(e.target.value)}
                  placeholder="Hoặc dán link ảnh"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setStartItem(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  if (!startItem) return;
                  try {
                    await handleStart(startItem.id, false);
                    setStartItem(null);
                  } catch (error) {
                    console.error(error);
                    toast.error('Không thể bắt đầu bảo trì');
                  }
                }}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <PlayCircle className="h-4 w-4" /> Xác nhận bắt đầu
              </button>
            </div>
          </div>
        </div>
      )}

      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Tiếp nhận công việc bảo trì</h3>
                <p className="mt-1 text-sm text-slate-600">{pendingTasks.length} công việc chờ tiếp nhận</p>
              </div>
              <button onClick={() => setShowAcceptModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-600">
                Không có công việc nào chờ tiếp nhận
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-100 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">{task.title}</h4>
                        {/* hide raw ID in modal list per UX request */}
                        {task.description && (
                          <p className="text-sm text-slate-700 mt-2">{task.description}</p>
                        )}
                        {task.priority && (
                          <p className="text-xs text-slate-600 mt-1">
                            <span className="font-medium">Độ ưu tiên:</span> {task.priority}
                          </p>
                        )}
                        {task.estimatedCost !== undefined && (
                          <p className="text-xs text-slate-600">
                            <span className="font-medium">Chi phí dự kiến:</span> {task.estimatedCost}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAcceptTaskFromModal(task.id)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap"
                      >
                        <PlayCircle className="h-4 w-4" /> Tiếp nhận
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAcceptModal(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
