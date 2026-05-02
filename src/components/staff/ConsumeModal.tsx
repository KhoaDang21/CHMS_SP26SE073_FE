import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { facilityService } from '../../services/facilityService';
import { extraChargeService } from '../../services/extraChargeService';
import type { FacilityAsset } from '../../types/facility.types';

interface Props {
  homestayId: string;
  bookingId?: string;
  open: boolean;
  onClose: () => void;
  onConsumed?: () => void;
}

export default function ConsumeModal({ homestayId, bookingId, open, onClose, onConsumed }: Props) {
  const [items, setItems] = useState<FacilityAsset[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const list = await facilityService.managerGetFacilities(homestayId);
        // filter consumable items
        setItems(list.filter((i) => i.consumable));
      } catch (err) {
        console.error(err);
        toast.error('Không thể tải danh sách hàng tiêu hao');
      }
    })();
  }, [open, homestayId]);

  const total = useMemo(() => {
    return Object.entries(selected).reduce((sum, [id, qty]) => {
      const it = items.find((x) => x.id === id);
      return sum + (Number(it?.unitPrice ?? 0) * Number(qty ?? 0));
    }, 0);
  }, [selected, items]);

  const handleChangeQty = (id: string, qty: number) => {
    setSelected((s) => ({ ...s, [id]: qty }));
  };

  const handleConfirm = async () => {
    if (Object.keys(selected).length === 0) return toast.error('Chọn ít nhất 1 item');
    setLoading(true);
    try {
      // iterate items and call consumeInventory
      for (const [id, qty] of Object.entries(selected)) {
        if (!qty || qty <= 0) continue;
        const res = await facilityService.consumeInventory(id, { bookingId, quantity: qty, staffId: undefined });
        if (!res.success) {
          toast.error(`Tiêu thụ thất bại cho item ${id}`);
        }
      }

      // If bookingId provided and total > 0, create a summarized extra charge
      if (bookingId && total > 0) {
        await extraChargeService.create({ bookingId, amount: total, note: `Phí tiêu thụ hàng tiêu hao tại checkout` });
      }

      toast.success('Xử lý tiêu thụ thành công');
      onClose();
      onConsumed?.();
    } catch (err) {
      console.error(err);
      toast.error('Xử lý thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl">
        <h2 className="text-xl font-bold mb-4">Tiêu thụ hàng tiêu hao</h2>
        <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-sm text-slate-500">Không có item tiêu hao</div>
          ) : (
            items.map((it) => (
              <div key={it.id} className="flex items-center justify-between border-b py-2">
                <div>
                  <div className="font-medium">{it.name}</div>
                  <div className="text-sm text-slate-500">{it.unit ?? 'cái'} • Giá: {it.unitPrice ?? 0}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={it.availableQuantity ?? 9999} value={selected[it.id] ?? 0} onChange={(e) => handleChangeQty(it.id, Number(e.target.value))} className="w-20 border rounded px-2 py-1" />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-700">Tổng: <b>{total}</b></div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded">Hủy</button>
            <button onClick={handleConfirm} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">{loading ? 'Đang xử lý...' : 'Xác nhận'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
