import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Image as ImageIcon,
  LogOut,
  Menu,
  Plus,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { authService } from "../../services/authService";
import { RoleBadge } from "../../components/common/RoleBadge";
import { managerNavItemsGrouped } from "../../config/adminNavItemsGrouped";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { managerHomestayService } from "../../services/managerHomestayService";
import { diningService } from "../../services/diningService";
import type { Homestay } from "../../types/homestay.types";
import type { DiningCombo } from "../../types/dining.types";
import { Switch } from "../../components/ui/switch";

const toTimeSpan = (hhmm: string) => {
  const v = (hhmm || "").trim();
  if (!v) return "";
  if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
  return v;
};

export default function ManagerDiningPage() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const groupedNavItems = managerNavItemsGrouped;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [homestayId, setHomestayId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [combos, setCombos] = useState<DiningCombo[]>([]);
  const [slots, setSlots] = useState<any[]>([]);

  const [creatingCombo, setCreatingCombo] = useState(false);
  const [comboName, setComboName] = useState("");
  const [comboDesc, setComboDesc] = useState("");
  const [comboPrice, setComboPrice] = useState<number>(0);
  const [comboMaxPeople, setComboMaxPeople] = useState<number>(1);
  const [comboImage, setComboImage] = useState<File | null>(null);

  const [creatingSlot, setCreatingSlot] = useState(false);
  const [slotStartTime, setSlotStartTime] = useState("18:00");
  const [slotMaxCapacity, setSlotMaxCapacity] = useState<number>(10);
  const [slotCutoffHours, setSlotCutoffHours] = useState<number>(2);

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

  useEffect(() => {
    loadHomestays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (homestayId) loadDining(homestayId);
  }, [homestayId]);

  const handleLogout = () => {
    authService.logout();
    navigate("/auth/login");
  };

  const resetComboForm = () => {
    setComboName("");
    setComboDesc("");
    setComboPrice(0);
    setComboMaxPeople(1);
    setComboImage(null);
  };

  const createCombo = async () => {
    if (!homestayId) return;
    if (!comboName.trim()) {
      toast.error("Vui lòng nhập tên món");
      return;
    }
    if (comboPrice <= 0) {
      toast.error("Giá phải lớn hơn 0");
      return;
    }
    if (comboMaxPeople <= 0) {
      toast.error("Số người tối đa phải lớn hơn 0");
      return;
    }

    setCreatingCombo(true);
    try {
      const created = await diningService.managerCreateCombo({
        homestayId,
        name: comboName.trim(),
        description: comboDesc.trim() || "-",
        price: comboPrice,
        maxPeople: comboMaxPeople,
        imageFile: comboImage,
      });

      if (!created) {
        toast.error("Tạo món thất bại");
        return;
      }
      toast.success("Đã tạo món mới");
      resetComboForm();
      await loadDining(homestayId);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Không thể tạo món");
    } finally {
      setCreatingCombo(false);
    }
  };

  const toggleCombo = async (comboId: string) => {
    try {
      await diningService.managerToggleCombo(comboId);
      setCombos((prev) =>
        prev.map((c) => (c.id === comboId ? { ...c, isActive: !c.isActive } : c)),
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Không thể cập nhật trạng thái món");
    }
  };

  const uploadComboImage = async (comboId: string, file: File) => {
    try {
      await diningService.managerUploadComboImage(comboId, file);
      toast.success("Đã cập nhật ảnh");
      await loadDining(homestayId);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Không thể cập nhật ảnh");
    }
  };

  const createSlot = async () => {
    if (!homestayId) return;
    const startTime = toTimeSpan(slotStartTime);
    if (!startTime) {
      toast.error("Vui lòng chọn giờ");
      return;
    }
    if (slotMaxCapacity <= 0) {
      toast.error("Sức chứa phải lớn hơn 0");
      return;
    }
    if (slotCutoffHours < 0) {
      toast.error("CutoffHours không hợp lệ");
      return;
    }

    setCreatingSlot(true);
    try {
      await diningService.managerCreateSlot({
        homestayId,
        startTime,
        maxCapacity: slotMaxCapacity,
        cutoffHours: slotCutoffHours,
      });
      toast.success("Đã tạo khung giờ");
      await loadDining(homestayId);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Không thể tạo khung giờ");
    } finally {
      setCreatingSlot(false);
    }
  };

  const deleteSlot = async (slotId: string) => {
    try {
      await diningService.managerDeleteSlot(slotId);
      toast.success("Đã xóa khung giờ");
      setSlots((prev) => prev.filter((s) => String(s?.id ?? s?.Id) !== String(slotId)));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Không thể xóa khung giờ");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } bg-white shadow-lg w-64`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-900">CHMS Manager</h1>
              <p className="text-xs text-gray-500">Menu & giờ phục vụ</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700" type="button">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 overflow-y-auto max-h-[calc(100vh-180px)] pb-32">
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
          <button
            onClick={handleLogout}
            type="button"
            className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className={`transition-all ${sidebarOpen ? "lg:ml-64" : "ml-0"}`}>
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4 gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700" type="button">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <div className="text-sm text-gray-500">Homestay</div>
                <select
                  value={homestayId}
                  onChange={(e) => setHomestayId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[280px] bg-white"
                >
                  {homestays.map((h) => (
                    <option key={String(h.id)} value={String(h.id)}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-700 font-semibold">
              <UtensilsCrossed className="w-5 h-5 text-blue-600" />
              Quản lý ăn uống
            </div>
          </div>
        </header>

        <main className="p-6 max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Menu & khung giờ phục vụ</h1>
            <p className="text-gray-600 mt-1">
              {selectedHomestay ? `Homestay: ${selectedHomestay.name}` : "Chọn homestay để quản lý"}
            </p>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              <p className="mt-3 text-gray-600">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Combos */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Combo / Món ăn</h2>
                    <p className="text-sm text-gray-500">Bật/tắt hiển thị món bằng switch.</p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50 mb-5">
                  <div className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Tạo món mới
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Tên món <span className="text-red-500">*</span></label>
                      <input
                        value={comboName}
                        onChange={(e) => setComboName(e.target.value)}
                        placeholder="VD: Cơm gà xối mỡ"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Giá (VNĐ) <span className="text-red-500">*</span></label>
                      <input
                        value={comboPrice}
                        onChange={(e) => setComboPrice(Number(e.target.value))}
                        type="number"
                        min={0}
                        placeholder="VD: 150000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Phục vụ tối đa (người) <span className="text-red-500">*</span></label>
                      <input
                        value={comboMaxPeople}
                        onChange={(e) => setComboMaxPeople(Number(e.target.value))}
                        type="number"
                        min={1}
                        placeholder="VD: 4"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Mô tả</label>
                      <input
                        value={comboDesc}
                        onChange={(e) => setComboDesc(e.target.value)}
                        placeholder="VD: Gà ta, cơm trắng, rau sống"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Ảnh món ăn</label>
                      <label className="flex items-center gap-3 px-3 py-2 border border-dashed border-gray-300 rounded-lg bg-white cursor-pointer hover:bg-gray-50">
                        <ImageIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">
                          {comboImage ? comboImage.name : "Nhấn để chọn ảnh (JPG, PNG...)"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setComboImage(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={createCombo}
                    disabled={creatingCombo}
                    type="button"
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-60"
                  >
                    <Plus className="w-4 h-4" />
                    {creatingCombo ? "Đang tạo..." : "Tạo món"}
                  </button>
                </div>

                <div className="space-y-3">
                  {combos.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-6">Chưa có món nào.</div>
                  ) : (
                    combos.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl border border-gray-200 bg-white p-4 flex items-start gap-4"
                      >
                        <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {c.imageUrl ? (
                            <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="font-bold text-gray-900 truncate">{c.name}</div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${c.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                                  {c.isActive ? "Đang hiển thị" : "Đã ẩn"}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1 line-clamp-2">{c.description}</div>
                              <div className="text-sm text-gray-700 mt-2 flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                                  {Number(c.price || 0).toLocaleString("vi-VN")}đ
                                </span>
                                <span className="text-gray-400">•</span>
                                <span>Phục vụ tối đa {c.maxPeople} người</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Hiển thị cho khách</span>
                                <Switch checked={c.isActive} onCheckedChange={() => toggleCombo(c.id)} />
                              </div>
                              <label className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer underline underline-offset-2">
                                Đổi ảnh
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) uploadComboImage(c.id, f);
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Slots */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Khung giờ phục vụ</h2>
                  <p className="text-sm text-gray-500">
                    Mỗi khung giờ có sức chứa tối đa và thời gian chốt đặt trước.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50 mb-5">
                  <div className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Tạo khung giờ mới
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Giờ phục vụ <span className="text-red-500">*</span></label>
                      <input
                        value={slotStartTime}
                        onChange={(e) => setSlotStartTime(e.target.value)}
                        type="time"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Sức chứa tối đa (đơn) <span className="text-red-500">*</span></label>
                      <input
                        value={slotMaxCapacity}
                        onChange={(e) => setSlotMaxCapacity(Number(e.target.value))}
                        type="number"
                        min={1}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Đặt trước tối thiểu (giờ) <span className="text-red-500">*</span></label>
                      <input
                        value={slotCutoffHours}
                        onChange={(e) => setSlotCutoffHours(Number(e.target.value))}
                        type="number"
                        min={0}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">VD: 2 = khách phải đặt trước 2 tiếng</p>
                    </div>
                  </div>
                  <button
                    onClick={createSlot}
                    disabled={creatingSlot}
                    type="button"
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
                  >
                    <Plus className="w-4 h-4" />
                    {creatingSlot ? "Đang tạo..." : "Tạo khung giờ"}
                  </button>
                </div>

                <div className="space-y-3">
                  {slots.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-6">Chưa có khung giờ.</div>
                  ) : (
                    slots.map((s: any) => {
                      const id = String(s?.id ?? s?.Id ?? "");
                      const startTime = String(s?.startTime ?? s?.StartTime ?? "").slice(0, 5);
                      const maxCapacity = Number(s?.maxCapacity ?? s?.MaxCapacity ?? 0);
                      const cutoffHours = Number(s?.cutoffHours ?? s?.CutoffHours ?? 0);
                      return (
                        <div key={id} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-4">
                          <div>
                            <div className="font-bold text-gray-900 text-lg">{startTime}</div>
                            <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                              <div>Tối đa <span className="font-semibold">{maxCapacity}</span> đơn / khung giờ</div>
                              <div>Khách phải đặt trước <span className="font-semibold">{cutoffHours} tiếng</span></div>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteSlot(id)}
                            type="button"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-semibold text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Xóa
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}

