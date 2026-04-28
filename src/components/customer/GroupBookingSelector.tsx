import { useState } from 'react';
import { Plus, X, Loader, AlertCircle, MapPin, Star, BedDouble, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { groupBookingService, type HomestayOption } from '../../services/groupBookingService';
import { districtService } from '../../services/districtService';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface GroupBookingSelectorProps {
  districtId?: string;
  districtName?: string;
  baseCapacity?: number;
  baseHomestay?: {
    homestayId: string;
    homestayName: string;
    capacity?: number;
    address?: string;
    pricePerNight?: number;
    images?: string[];
    ratings?: number;
  };
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  selectedHomestays: string[]; // homestayIds đã chọn
  onHomestaysChange: (homestayIds: string[]) => void;
  disabled?: boolean;
}

export default function GroupBookingSelector({
  districtId,
  districtName,
  baseCapacity,
  baseHomestay,
  checkIn,
  checkOut,
  guestsCount,
  selectedHomestays,
  onHomestaysChange,
  disabled,
}: GroupBookingSelectorProps) {
  const [searching, setSearching] = useState(false);
  const [alternatives, setAlternatives] = useState<HomestayOption[]>([]);
  const [totalCapacity, setTotalCapacity] = useState<number | null>(null);
  const [totalPricePerNight, setTotalPricePerNight] = useState<number | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);

  const guestShortfall = Math.max(0, guestsCount - (baseCapacity ?? 0));
  const requiredAdditionalGuests = baseCapacity !== undefined ? guestShortfall : guestsCount;
  // Align request payload with Swagger tests: send total guests count from booking form.
  const searchGuestCount = Math.max(1, guestsCount);
  const selectedAltHomestays = alternatives.filter(h => selectedHomestays.includes(h.homestayId) && h.homestayId !== baseHomestay?.homestayId);
  const remainingHomestays = alternatives.filter(h => !selectedHomestays.includes(h.homestayId) && h.homestayId !== baseHomestay?.homestayId);
  const selectedCapacity = selectedAltHomestays.reduce((sum, home) => sum + (home.capacity ?? 0), 0);
  const selectedCapacityGap = Math.max(0, requiredAdditionalGuests - selectedCapacity);

  const showCenteredFailureToast = (message: string) => {
    setFailureMessage(message);
  };

  const resolveDistrictId = async (): Promise<string | null> => {
    if (districtId) return districtId;
    if (!districtName) return null;

    const districts = await districtService.getAllDistricts();
    const targetName = districtName.trim().toLowerCase();
    const matched = districts.find((item) => {
      const name = item.name.trim().toLowerCase();
      return name === targetName || name.includes(targetName) || targetName.includes(name);
    });

    return matched?.id ?? null;
  };

  const handleSearch = async () => {
    setFailureMessage(null);
    if (!checkIn || !checkOut || guestsCount < 1) {
      setSearchError('Vui lòng nhập đầy đủ thông tin (ngày, số khách)');
      return;
    }

    if (guestShortfall <= 0 && baseCapacity !== undefined) {
      setSearchError('Homestay chính đã đủ chỗ cho số khách hiện tại.');
      setExpanded(true);
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const resolvedDistrictId = await resolveDistrictId();
      if (!resolvedDistrictId) {
        setSearchError('Không tìm được districtId từ homestay này. Vui lòng kiểm tra dữ liệu địa điểm.');
        showCenteredFailureToast('Xin lỗi, chúng tôi chưa xác định được khu vực để tìm homestay phù hợp.');
        return;
      }

      const result = await groupBookingService.searchCombination({
        districtId: resolvedDistrictId,
        checkIn,
        checkOut,
        guestsCount: searchGuestCount,
      });

      const homestays = result?.homestays || result?.alternativeHomestays || [];
      setAlternatives(homestays);
      setTotalCapacity(result?.totalCapacity ?? null);
      setTotalPricePerNight(result?.totalPricePerNight ?? null);

      if (result?.success === false) {
        const failedMessage = result?.message || 'Khu vực này hiện không còn đủ chỗ trống để ghép homestay.';
        setSearchError(failedMessage);
        showCenteredFailureToast(`Tìm homestay thất bại: ${failedMessage}\nXin lỗi vì sự thiếu sót của chúng tôi.`);
        setExpanded(true);
        return;
      }

      if (!homestays.length) {
        setSearchError('Không tìm thấy homestay khác phù hợp');
        showCenteredFailureToast('Không tìm thấy homestay phù hợp.\nXin lỗi vì sự thiếu sót của chúng tôi.');
      }
      setExpanded(true);
    } catch (error) {
      console.error('Search combination error:', error);
      setSearchError('Lỗi khi tìm kiếm. Vui lòng thử lại.');
      const message = error instanceof Error ? error.message : 'Không thể tìm kiếm homestay';
      showCenteredFailureToast(`Tìm homestay thất bại: ${message}\nXin lỗi vì sự thiếu sót của chúng tôi.`);
    } finally {
      setSearching(false);
    }
  };

  const handleAddHomestay = (homestayId: string) => {
    if (!selectedHomestays.includes(homestayId)) {
      onHomestaysChange([...selectedHomestays, homestayId]);
      toast.success('Đã thêm homestay');
    }
  };

  const handleRemoveHomestay = (homestayId: string) => {
    onHomestaysChange(selectedHomestays.filter(id => id !== homestayId));
    toast.success('Đã xóa homestay');
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
      {failureMessage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Đóng thông báo"
            onClick={() => setFailureMessage(null)}
          />
          <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-red-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-xl font-bold">
                !
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold text-gray-900">Không thể tìm homestay phù hợp</div>
                <p className="mt-2 text-sm leading-7 text-gray-700 whitespace-pre-line break-words">{failureMessage}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setFailureMessage(null)}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={expanded}
            onChange={() => {
              if (!expanded) {
                handleSearch();
              } else {
                setExpanded(false);
                onHomestaysChange([]);
                setAlternatives([]);
                setFailureMessage(null);
              }
            }}
            disabled={disabled || searching}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="font-semibold text-gray-800">Tìm homestay xung quanh để đặt thêm</span>
        </label>
        {searching && <Loader className="w-5 h-5 animate-spin text-blue-600" />}
      </div>

      {!districtId && districtName && (
        <div className="flex items-start gap-2 mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-blue-800">Đang dò districtId từ tên địa điểm: {districtName}</span>
        </div>
      )}

      {searchError && (
        <div className="flex items-start gap-2 mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-yellow-800">{searchError}</span>
        </div>
      )}

      {expanded && (totalCapacity !== null || totalPricePerNight !== null) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {totalCapacity !== null && (
            <div className="rounded-lg bg-white border border-blue-100 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Tổng sức chứa</p>
                <p className="text-sm font-semibold text-gray-900">{totalCapacity} khách</p>
              </div>
            </div>
          )}
          {totalPricePerNight !== null && (
            <div className="rounded-lg bg-white border border-cyan-100 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600">
                <BedDouble className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Tổng giá/đêm</p>
                <p className="text-sm font-semibold text-gray-900">{totalPricePerNight.toLocaleString('vi-VN')} ₫</p>
              </div>
            </div>
          )}
        </div>
      )}

      {expanded && (
        <div className="mb-3 rounded-lg border border-cyan-200 bg-white/70 p-3 text-sm text-gray-700 space-y-1">
          {baseCapacity !== undefined && (
            <p>
              Homestay chính chứa được <span className="font-semibold text-gray-900">{baseCapacity} khách</span>.
            </p>
          )}
          <p>
            Số khách cần ghép thêm: <span className="font-semibold text-gray-900">{requiredAdditionalGuests} khách</span>
          </p>
          <p>
            Kết quả tìm dựa trên tổng số khách: <span className="font-semibold text-gray-900">{searchGuestCount} khách</span>
          </p>
          <p>
            Đã chọn thêm: <span className="font-semibold text-gray-900">{selectedCapacity} khách</span>
            {selectedCapacityGap > 0 ? (
              <span className="text-red-600">, còn thiếu {selectedCapacityGap} khách</span>
            ) : (
              <span className="text-green-600">, đã đủ chỗ</span>
            )}
          </p>
        </div>
      )}

      {expanded && (
        <>
          {/* Split lists: selected vs remaining */}
          {(baseHomestay || alternatives.length > 0) && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">
                  Homestay đã chọn ({(baseHomestay ? 1 : 0) + selectedAltHomestays.length})
                </h4>
                {(baseHomestay ? 1 : 0) + selectedAltHomestays.length === 0 ? (
                  <div className="text-xs text-gray-500 bg-white border border-dashed border-gray-300 rounded p-3">
                    Chưa chọn homestay nào.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {baseHomestay && (
                      <div className="flex items-center justify-between gap-3 p-3 bg-white rounded border border-cyan-200 bg-cyan-50">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {baseHomestay.images && baseHomestay.images[0] && (
                            <ImageWithFallback
                              src={baseHomestay.images[0]}
                              alt={baseHomestay.homestayName}
                              className="w-12 h-12 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-gray-900 truncate">{baseHomestay.homestayName}</p>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-semibold">Homestay chính</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mt-1">
                              {baseHomestay.capacity !== undefined && (
                                <>
                                  <Users className="w-3 h-3" />
                                  <span>{baseHomestay.capacity} khách</span>
                                </>
                              )}
                              {baseHomestay.address && (
                                <>
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate max-w-[240px]">{baseHomestay.address}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedAltHomestays.map(home => (
                      <div key={home.homestayId} className="flex items-center justify-between gap-3 p-3 bg-white rounded border border-green-200 bg-green-50">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {home.images && home.images[0] && (
                            <ImageWithFallback
                              src={home.images[0]}
                              alt={home.homestayName}
                              className="w-12 h-12 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-gray-900 truncate">{home.homestayName}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                              {home.capacity !== undefined && (
                                <>
                                  <Users className="w-3 h-3" />
                                  <span>{home.capacity} khách</span>
                                </>
                              )}
                              {home.address && (
                                <>
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate max-w-[240px]">{home.address}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveHomestay(home.homestayId)}
                          className="p-1 hover:bg-red-100 rounded text-red-600 flex-shrink-0"
                          type="button"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-1">
                  Homestay còn lại ({remainingHomestays.length})
                </h4>
                <p className="text-xs text-gray-500 mb-2">
                  API trả về {alternatives.length} homestay, đã ghép sẵn {baseHomestay ? 1 : 0} homestay chính.
                </p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {remainingHomestays
                    .map(home => (
                      <div key={home.homestayId} className="flex items-center justify-between gap-3 p-3 bg-white rounded border border-gray-200 hover:border-blue-300 hover:shadow-sm transition">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {home.images && home.images[0] ? (
                            <ImageWithFallback
                              src={home.images[0]}
                              alt={home.homestayName}
                              className="w-12 h-12 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                              {home.homestayName?.charAt(0)?.toUpperCase() || 'H'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-gray-900 truncate">{home.homestayName}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                              {home.capacity !== undefined && (
                                <>
                                  <Users className="w-3 h-3" />
                                  <span>{home.capacity} khách</span>
                                </>
                              )}
                              {home.address && (
                                <>
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate max-w-[240px]">{home.address}</span>
                                </>
                              )}
                              {home.ratings !== undefined && (
                                <>
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span>{home.ratings.toFixed(1)}</span>
                                </>
                              )}
                            </div>
                            {home.pricePerNight && (
                              <p className="text-xs font-semibold text-blue-600 mt-1">
                                {home.pricePerNight.toLocaleString('vi-VN')} ₫/đêm
                              </p>
                            )}
                            {home.capacity !== undefined && selectedCapacityGap > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Gợi ý cho {selectedCapacityGap} khách còn thiếu
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddHomestay(home.homestayId)}
                          className="p-2 hover:bg-blue-100 rounded text-blue-600 flex-shrink-0 transition disabled:opacity-40"
                          type="button"
                          title="Thêm homestay"
                          disabled={selectedHomestays.includes(home.homestayId)}
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  {remainingHomestays.length === 0 && (
                    <div className="text-xs text-gray-500 bg-white border border-dashed border-gray-300 rounded p-3">
                      Không còn homestay nào chưa chọn.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
