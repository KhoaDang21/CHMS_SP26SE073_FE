import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Image as ImageIcon,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
  X,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { authService } from "../../services/authService";
import { RoleBadge } from "../../components/common/RoleBadge";
import { managerNavItemsGrouped } from "../../config/adminNavItemsGrouped";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { managerHomestayService } from "../../services/managerHomestayService";
import { diningService } from "../../services/diningService";
import type { Homestay } from "../../types/homestay.types";
import type { DiningCombo, DiningOrder, DiningTimeSlot } from "../../types/dining.types";
import { Switch } from "../../components/ui/switch";

const toTimeSpan = (hhmm: string) => {
  const v = (hhmm || "").trim();
  if (!v) return "";
  if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
  return v;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  PREPARING: "Đang làm",
  SERVED: "Đã phục vụ",
  CANCELLED: "Đã hủy",
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  PREPARING: "bg-blue-100 text-blue-700 border-blue-200",
  SERVED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
};

type Tab = "menu" | "orders";

export default function ManagerDiningPage() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const groupedNavItems = managerNavItemsGrouped;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [homestayId, setHomestayId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<Tab>("menu");

  const [loading, setLoading] = useState(true);
  const [combos, setCombos] = useState<DiningCombo[]>([]);
  const [slots, setSlots] = useState<DiningTimeSlot[]>([]);

  // Create combo form
  const [creatingCombo, setCreatingCombo] = useState(false);
  const [comboName, setComboName] = useState("");
  const [comboDesc, setComboDesc] = useState("");
  const [comboPrice, setComboPrice] = useState<number>(0);
  const [comboMaxPeople, setComboMaxPeople] = useState<number>(1);
  const [comboImage, setComboImage] = useState<File | null>(null);

  // Edit combo modal
  const [editingCombo, setEditingCombo] = useState<DiningCombo | null>(null);
  const [editComboName, setEditComboName] = useState("");
  const [editComboDesc, setEditComboDesc] = useState("");
  const [editComboPrice, setEditComboPrice] = useState<number>(0);
  const [editComboMaxPeople, setEditComboMaxPeople] = useState<number>(1);
  const [savingCombo, setSavingCombo] = useState(false);

  // Create slot form
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [slotStartTime, setSlotStartTime] = useState("18:00");
  const [slotEndTime, setSlotEndTime] = useState("19:00");
  const [slotMaxCapacity, setSlotMaxCapacity] = useState<number>(10);
  const [slotCutoffHours, setSlotCutoffHours] = useState<number>(2);

  // Edit slot modal
  const [editingSlot, setEditingSlot] = useState<DiningTimeSlot | null>(null);
  const [editSlotStart, setEditSlotStart] = useState("");
  const [editSlotEnd, setEditSlotEnd] = useState("");
  const [editSlotCapacity, setEditSlotCapacity] = useState<number>(10);
  const [editSlotCutoff, setEditSlotCutoff] = useState<number>(2);
  const [savingSlot, setSavingSlot] = useState(false);

  // Orders tab
  const [orders, setOrders] = useState<DiningOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersTotalCount, setOrdersTotalCount] = useState(0);
  const [ordersTotalRevenue, setOrdersTotalRevenue] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersStatus, setOrdersStatus] = useState("");
  const [ordersFrom, setOrdersFrom] = useState("");
  const [ordersTo, setOrdersTo] = useState("");

  const selectedHomestay = useMemo(
    () => homestays.find((h) => String(h.id) === String(homestayId)) ?? null,
    [homestays, homestayId],
  );

  const loadHomestays = async () => {
    try {
      const list = await managerHomestayService.list();
      setHomestays(list);
      if (!homestayId && list.length > 0) setHomestayId(String(list[0].id));
    } catch (e) {
      console.error(e);
      toast.error("Không thể tải danh sách homestay");
    }
  };

  const loadDining = async (hsId: string) => {
    if (!hsId) return;
    setLoading(true);
    try {
      const [comboList, slotList] = await Promise.all([
        diningService.managerGetCombos(hsId),
        diningService.managerGetSlots(hsId),
      ]);
      setCombos(comboList);
      setSlots(slotList);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Không thể tải dữ liệu ăn uống");
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async (hsId: string, page = 1) => {
    if (!hsId) return;
    setOrdersLoading(true);
    try {
      const result = await diningService.managerGetOrders({
        homestayId: hsId,
        fromDate: ordersFrom || undefined,
        toDate: ordersTo || undefined,
        status: ordersStatus || undefined,
        pageNumber: page,
        pageSize: 20,
      });
      setOrders(result.items);
      setOrdersTotalCount(result.totalCount);
      setOrdersTotalRevenue(result.totalRevenue);
      setOrdersPage(result.pageNumber);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Không thể tải lịch sử đơn");
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => { loadHomestays(); }, []);
  useEffect(() => { if (homestayId) loadDining(homestayId); }, [homestayId]);
  useEffect(() => {
    if (homestayId && activeTab === "orders") loadOrders(homestayId, 1);
  }, [homestayId, activeTab]);

  const handleLogout = () => { authService.logout(); navigate("/auth/login"); };

  const resetComboForm = () => {
    setComboName(""); setComboDesc(""); setComboPrice(0); setComboMaxPeople(1); setComboImage(null);
  };

  const createCombo = async () => {
    if (!homestayId) return;
    if (!comboName.trim()) { toast.error("Vui lòng nhập tên món"); return; }
    if (comboPrice <= 0) { toast.error("Giá phải lớn hơn 0"); return; }
    if (comboMaxPeople <= 0) { toast.error("Số người tối đa phải lớn hơn 0"); return; }
    setCreatingCombo(true);
    try {
      const created = await diningService.managerCreateCombo({
        homestayId, name: comboName.trim(),
        description: comboDesc.trim() || "-",
        price: comboPrice, maxPeople: comboMaxPeople, imageFile: comboImage,
      });
      if (!created) { toast.error("Tạo món thất bại"); return; }
      toast.success("Đã tạo món mới");
      resetComboForm();
      await loadDining(homestayId);
    } catch (e: any) {
      toast.error(e?.message || "Không thể tạo món");
    } finally {
      setCreatingCombo(false);
    }
  };

  const openEditCombo = (c: DiningCombo) => {
    setEditingCombo(c);
    setEditComboName(c.name);
    setEditComboDesc(c.description);
    setEditComboPrice(c.price);
    setEditComboMaxPeople(c.maxPeople);
  };

  const saveEditCombo = async () => {
    if (!editingCombo) return;
    if (!editComboName.trim()) { toast.error("Tên món không được để trống"); return; }
    if (editComboPrice <= 0) { toast.error("Giá phải lớn hơn 0"); return; }
    if (editComboMaxPeople <= 0) { toast.error("Số người tối đa phải lớn hơn 0"); return; }
    setSavingCombo(true);
    try {
      const updated = await diningService.managerUpdateCombo(editingCombo.id, {
        name: editComboName.trim(),
        description: editComboDesc.trim() || "-",
        price: editComboPrice,
        maxPeople: editComboMaxPeople,
      });
      if (updated) {
        setCombos((prev) => prev.map((c) => c.id === editingCombo.id ? updated : c));
        toast.success("Đã cập nhật món");
        setEditingCombo(null);
      }
    } catch (e: any) {
      toast.error(e?.message || "Không thể cập nhật món");
    } finally {
      setSavingCombo(false);
    }
  };

  const toggleCombo = async (comboId: string) => {
    try {
      await diningService.managerToggleCombo(comboId);
      setCombos((prev) => prev.map((c) => c.id === comboId ? { ...c, isActive: !c.isActive } : c));
    } catch (e: any) {
      toast.error(e?.message || "Không thể cập nhật trạng thái món");
    }
  };

  const uploadComboImage = async (comboId: string, file: File) => {
    try {
      await diningService.managerUploadComboImage(comboId, file);
      toast.success("Đã cập nhật ảnh");
      await loadDining(homestayId);
    } catch (e: any) {
      toast.error(e?.message || "Không thể cập nhật ảnh");
    }
  };

  const deleteCombo = async (comboId: string) => {
    try {
      await diningService.managerDeleteCombo(comboId);
      toast.success("Đã xóa món");
      setCombos((prev) => prev.filter((c) => String(c.id) !== String(comboId)));
    } catch (e: any) {
      toast.error(e?.message || "Không thể xóa món (có thể còn đơn chưa hoàn tất)");
    }
  };

  const createSlot = async () => {
    if (!homestayId) return;
    const startTime = toTimeSpan(slotStartTime);
    const endTime = toTimeSpan(slotEndTime);
    if (!startTime || !endTime) { toast.error("Vui lòng chọn giờ"); return; }
    if (slotMaxCapacity <= 0) { toast.error("Sức chứa phải lớn hơn 0"); return; }
    if (slotCutoffHours < 0) { toast.error("CutoffHours không hợp lệ"); return; }
    setCreatingSlot(true);
    try {
      await diningService.managerCreateSlot({ homestayId, startTime, endTime, maxCapacity: slotMaxCapacity, cutoffHours: slotCutoffHours });
      toast.success("Đã tạo khung giờ");
      await loadDining(homestayId);
    } catch (e: any) {
      toast.error(e?.message || "Không thể tạo khung giờ");
    } finally {
      setCreatingSlot(false);
    }
  };

  const openEditSlot = (s: DiningTimeSlot) => {
    setEditingSlot(s);
    setEditSlotStart(String(s.startTime || "").slice(0, 5));
    setEditSlotEnd(String(s.endTime || "").slice(0, 5));
    setEditSlotCapacity(s.maxCapacity);
    setEditSlotCutoff(s.cutoffHours);
  };

  const saveEditSlot = async () => {
    if (!editingSlot) return;
    if (editSlotCapacity <= 0) { toast.error("Sức chứa phải lớn hơn 0"); return; }
    setSavingSlot(true);
    try {
      const updated = await diningService.managerUpdateSlot(editingSlot.id, {
        startTime: toTimeSpan(editSlotStart) || undefined,
        endTime: toTimeSpan(editSlotEnd) || undefined,
        maxCapacity: editSlotCapacity,
        cutoffHours: editSlotCutoff,
      });
      if (updated) {
        setSlots((prev) => prev.map((s) => s.id === editingSlot.id ? updated : s));
        toast.success("Đã cập nhật khung giờ");
        setEditingSlot(null);
      }
    } catch (e: any) {
      toast.error(e?.message || "Không thể cập nhật khung giờ");
    } finally {
      setSavingSlot(false);
    }
  };

  const deleteSlot = async (slotId: string) => {
    try {
      await diningService.managerDeleteSlot(slotId);
      toast.success("Đã xóa khung giờ");
      setSlots((prev) => prev.filter((s) => String(s.id) !== String(slotId)));
    } catch (e: any) {
      toast.error(e?.message || "Không thể xóa khung giờ");
    }
  };

  const searchOrders = () => { if (homestayId) loadOrders(homestayId, 1); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} bg-white shadow-lg w-64`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-900">CHMS Manager</h1>
              <p className="text-xs text-gray-500">Menu & giờ phục vụ</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700" type="button"><X className="w-6 h-6" /></button>
        </div>
        <nav className="p-4">
          <AdminSidebar groupedItems={groupedNavItems} />
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() ?? "M"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user?.name ?? "Manager"}</p>
              <div className="mt-1">{user?.role && <RoleBadge role={user.role} size="sm" />}</div>
            </div>
          </div>
          <button onClick={handleLogout} type="button" className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" /><span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className={`transition-all ${sidebarOpen ? "lg:ml-64" : "ml-0"}`}>
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4 gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700" type="button"><Menu className="w-6 h-6" /></button>
              <div>
                <div className="text-sm text-gray-500">Homestay</div>
                <select value={homestayId} onChange={(e) => setHomestayId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[280px] bg-white">
                  {homestays.map((h) => <option key={String(h.id)} value={String(h.id)}>{h.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-700 font-semibold">
              <UtensilsCrossed className="w-5 h-5 text-blue-600" />Quản lý ăn uống
            </div>
          </div>
          {/* Tabs */}
          <div className="flex border-t border-gray-100 px-6">
            <button type="button" onClick={() => setActiveTab("menu")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "menu" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <UtensilsCrossed className="w-4 h-4" />Menu & Khung giờ
            </button>
            <button type="button" onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "orders" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <ClipboardList className="w-4 h-4" />Lịch sử đơn
            </button>
          </div>
        </header>

        <main className="p-6 max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{activeTab === "menu" ? "Menu & khung giờ phục vụ" : "Lịch sử đơn dining"}</h1>
            <p className="text-gray-600 mt-1">{selectedHomestay ? `Homestay: ${selectedHomestay.name}` : "Chọn homestay để quản lý"}</p>
          </div>

          {/* ── TAB: MENU ── */}
          {activeTab === "menu" && (
            loading ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                <p className="mt-3 text-gray-600">Đang tải dữ liệu...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Combos */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Combo / Món ăn</h2>
                    <p className="text-sm text-gray-500">Bật/tắt hiển thị món bằng switch. Nhấn bút chì để sửa.</p>
                  </div>
                  {/* Create form */}
                  <div className="rounded-xl border border-gray-200 p-4 bg-gradient-to-br from-gray-50 to-white mb-5">
                    <div className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-blue-600" />
                      <span>Tạo món mới</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Tên món <span className="text-red-500">*</span></label>
                        <input value={comboName} onChange={(e) => setComboName(e.target.value)} placeholder="VD: Cơm gà xối mỡ" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Giá (VNĐ) <span className="text-red-500">*</span></label>
                        <input value={comboPrice} onChange={(e) => setComboPrice(Number(e.target.value))} type="number" min={0} placeholder="VD: 150000" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Tối đa (người) <span className="text-red-500">*</span></label>
                        <input value={comboMaxPeople} onChange={(e) => setComboMaxPeople(Number(e.target.value))} type="number" min={1} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Mô tả</label>
                        <input value={comboDesc} onChange={(e) => setComboDesc(e.target.value)} placeholder="VD: Gà ta, cơm trắng..." className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Ảnh món ăn</label>
                        <label className="flex items-center gap-3 px-3 py-2.5 border border-dashed border-gray-300 rounded-lg bg-white cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-colors">
                          <ImageIcon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{comboImage ? comboImage.name : "Nhấn để chọn ảnh"}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => setComboImage(e.target.files?.[0] ?? null)} />
                        </label>
                      </div>
                    </div>
                    <button onClick={createCombo} disabled={creatingCombo} type="button"
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all">
                      {creatingCombo ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang tạo...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Tạo món</span>
                        </>
                      )}
                    </button>
                  </div>
                  {/* List */}
                  <div className="space-y-3">
                    {combos.length === 0 ? (
                      <div className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
                        <UtensilsCrossed className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p>Chưa có món nào.</p>
                      </div>
                    ) : combos.map((c) => (
                      <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                            {c.imageUrl ? (
                              <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <div className="font-bold text-gray-900 truncate">{c.name}</div>
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${c.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                                    {c.isActive ? "Hiển thị" : "Đã ẩn"}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 line-clamp-2 mb-2">{c.description}</div>
                                <div className="text-sm text-gray-700 flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                                    {Number(c.price || 0).toLocaleString("vi-VN")}đ
                                  </span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-600">Tối đa {c.maxPeople} người</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 font-medium">Hiển thị</span>
                                  <Switch checked={c.isActive} onCheckedChange={() => toggleCombo(c.id)} />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button onClick={() => openEditCombo(c)} type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors">
                                <Pencil className="w-3 h-3" />Sửa
                              </button>
                              <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 font-semibold text-xs cursor-pointer transition-colors">
                                <ImageIcon className="w-3 h-3" />Đổi ảnh
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadComboImage(c.id, f); }} />
                              </label>
                              <button onClick={() => deleteCombo(c.id)} type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-semibold text-xs transition-colors">
                                <Trash2 className="w-3 h-3" />Xóa
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slots */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Khung giờ phục vụ</h2>
                    <p className="text-sm text-gray-500">Mỗi khung giờ có sức chứa tối đa và thời gian chốt đặt trước.</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4 bg-gray-50 mb-5">
                    <div className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Plus className="w-4 h-4" />Tạo khung giờ mới</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Giờ bắt đầu <span className="text-red-500">*</span></label>
                        <input value={slotStartTime} onChange={(e) => setSlotStartTime(e.target.value)} type="time" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Giờ kết thúc <span className="text-red-500">*</span></label>
                        <input value={slotEndTime} onChange={(e) => setSlotEndTime(e.target.value)} type="time" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Sức chứa (đơn) <span className="text-red-500">*</span></label>
                        <input value={slotMaxCapacity} onChange={(e) => setSlotMaxCapacity(Number(e.target.value))} type="number" min={1} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Đặt trước tối thiểu (giờ) <span className="text-red-500">*</span></label>
                        <input value={slotCutoffHours} onChange={(e) => setSlotCutoffHours(Number(e.target.value))} type="number" min={0} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                        <p className="text-xs text-gray-400 mt-1">VD: 2 = khách phải đặt trước 2 tiếng</p>
                      </div>
                    </div>
                    <button onClick={createSlot} disabled={creatingSlot} type="button"
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60">
                      <Plus className="w-4 h-4" />{creatingSlot ? "Đang tạo..." : "Tạo khung giờ"}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {slots.length === 0 ? <div className="text-sm text-gray-500 text-center py-6">Chưa có khung giờ.</div> : slots.map((s) => {
                      const id = String(s.id);
                      return (
                        <div key={id} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-4">
                          <div>
                            <div className="font-bold text-gray-900 text-lg">{String(s.startTime || "").slice(0, 5)} - {String(s.endTime || "").slice(0, 5)}</div>
                            <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                              <div>Tối đa <span className="font-semibold">{s.maxCapacity}</span> đơn / khung giờ</div>
                              <div>Đặt trước <span className="font-semibold">{s.cutoffHours} tiếng</span></div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditSlot(s)} type="button" className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-sm">
                              <Pencil className="w-4 h-4" />Sửa
                            </button>
                            <button onClick={() => deleteSlot(id)} type="button" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-semibold text-sm">
                              <Trash2 className="w-4 h-4" />Xóa
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )
          )}

          {/* ── TAB: ORDERS ── */}
          {activeTab === "orders" && (
            <div className="space-y-5">
              {/* Filters */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap gap-4 items-end">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Từ ngày</label>
                  <input value={ordersFrom} onChange={(e) => setOrdersFrom(e.target.value)} type="date" className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Đến ngày</label>
                  <input value={ordersTo} onChange={(e) => setOrdersTo(e.target.value)} type="date" className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Trạng thái</label>
                  <select value={ordersStatus} onChange={(e) => setOrdersStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
                    <option value="">Tất cả</option>
                    <option value="PENDING">Chờ xác nhận</option>
                    <option value="PREPARING">Đang làm</option>
                    <option value="SERVED">Đã phục vụ</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </div>
                <button onClick={searchOrders} type="button" className="px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black text-sm">Tìm kiếm</button>
                <div className="ml-auto text-right">
                  <div className="text-xs text-gray-500">Tổng đơn</div>
                  <div className="font-bold text-gray-900">{ordersTotalCount}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Doanh thu</div>
                  <div className="font-bold text-cyan-700">{Number(ordersTotalRevenue).toLocaleString("vi-VN")}đ</div>
                </div>
              </div>

              {ordersLoading ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                  <p className="mt-3 text-gray-600">Đang tải...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-500 text-sm">Không có đơn nào.</div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Ngày</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Khách</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Món</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Giờ</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Vị trí</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-700">Giá</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-700">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.map((o) => {
                        const st = String(o.status || "").toUpperCase();
                        return (
                          <tr key={o.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-700">{String(o.orderDate || "").slice(0, 10)}</td>
                            <td className="px-4 py-3 text-gray-700">{o.customerName || "—"}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{o.comboName}</td>
                            <td className="px-4 py-3 text-gray-600">{String(o.startTime || "").slice(0, 5)}</td>
                            <td className="px-4 py-3 text-gray-600">{o.serveLocation === "BEACH" ? "Bãi biển" : "Phòng"}</td>
                            <td className="px-4 py-3 text-right font-semibold text-cyan-700">{Number(o.totalAmount || o.price || 0).toLocaleString("vi-VN")}đ</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${STATUS_COLOR[st] ?? STATUS_COLOR.PENDING}`}>{STATUS_LABEL[st] ?? st}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* Pagination */}
                  {ordersTotalCount > 20 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                      <span className="text-sm text-gray-500">Trang {ordersPage} · {ordersTotalCount} đơn</span>
                      <div className="flex gap-2">
                        <button disabled={ordersPage <= 1} onClick={() => loadOrders(homestayId, ordersPage - 1)} type="button"
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold disabled:opacity-40 hover:bg-gray-50">Trước</button>
                        <button disabled={ordersPage * 20 >= ordersTotalCount} onClick={() => loadOrders(homestayId, ordersPage + 1)} type="button"
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold disabled:opacity-40 hover:bg-gray-50">Sau</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── MODAL: Edit Combo ── */}
      {editingCombo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Sửa món: {editingCombo.name}</h3>
              <button onClick={() => setEditingCombo(null)} type="button" className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tên món <span className="text-red-500">*</span></label>
                <input value={editComboName} onChange={(e) => setEditComboName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Mô tả</label>
                <input value={editComboDesc} onChange={(e) => setEditComboDesc(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Giá (VNĐ) <span className="text-red-500">*</span></label>
                  <input value={editComboPrice} onChange={(e) => setEditComboPrice(Number(e.target.value))} type="number" min={0} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Tối đa (người) <span className="text-red-500">*</span></label>
                  <input value={editComboMaxPeople} onChange={(e) => setEditComboMaxPeople(Number(e.target.value))} type="number" min={1} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditingCombo(null)} type="button" className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">Hủy</button>
              <button onClick={saveEditCombo} disabled={savingCombo} type="button"
                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-60">
                {savingCombo ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Slot ── */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Sửa khung giờ</h3>
              <button onClick={() => setEditingSlot(null)} type="button" className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Giờ bắt đầu</label>
                  <input value={editSlotStart} onChange={(e) => setEditSlotStart(e.target.value)} type="time" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Giờ kết thúc</label>
                  <input value={editSlotEnd} onChange={(e) => setEditSlotEnd(e.target.value)} type="time" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Sức chứa (đơn) <span className="text-red-500">*</span></label>
                  <input value={editSlotCapacity} onChange={(e) => setEditSlotCapacity(Number(e.target.value))} type="number" min={1} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Đặt trước (giờ)</label>
                  <input value={editSlotCutoff} onChange={(e) => setEditSlotCutoff(Number(e.target.value))} type="number" min={0} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditingSlot(null)} type="button" className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">Hủy</button>
              <button onClick={saveEditSlot} disabled={savingSlot} type="button"
                className="flex-1 px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60">
                {savingSlot ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
