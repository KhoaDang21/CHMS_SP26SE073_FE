import { useState } from 'react';
import { X, Loader2, AlertCircle, Star, Users, Bed, Waves, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Homestay } from '../../types/homestay.types';
import type { HomestayCompareScore } from '../../services/publicHomestayService';
import { publicHomestayService } from '../../services/publicHomestayService';

const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatVndPrice(price: number): string {
  return vndFormatter.format(Number(price) || 0);
}

interface CompareHomestaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableHomestays: Homestay[];
  onBooking?: (homestayId: string) => void;
}

export default function CompareHomestaysModal({
  isOpen,
  onClose,
  availableHomestays,
  onBooking,
}: CompareHomestaysModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customerPreferences, setCustomerPreferences] = useState('');
  const [comparisonData, setComparisonData] = useState<Homestay[]>([]);
  const [aiAnalysisMarkdown, setAiAnalysisMarkdown] = useState('');
  const [scoreMap, setScoreMap] = useState<Record<string, HomestayCompareScore>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'compare'>('select');

  if (!isOpen) return null;

  const handleSelectHomestay = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      if (selectedIds.length < 4) {
        setSelectedIds([...selectedIds, id]);
      } else {
        toast.error('Tối đa 4 homestay có thể so sánh được');
      }
    }
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      toast.error('Chọn tối thiểu 2 homestay để so sánh');
      return;
    }

    setIsLoading(true);
    try {
      const result = await publicHomestayService.compare(selectedIds, customerPreferences);
      if (result && result.homestays.length > 0) {
        setComparisonData(result.homestays);
        setAiAnalysisMarkdown((result.aiAnalysisMarkdown ?? '').trim());
        const mappedScores = Object.fromEntries(
          (result.scores ?? [])
            .filter((item) => item?.homestayId)
            .map((item) => [item.homestayId, item]),
        ) as Record<string, HomestayCompareScore>;
        setScoreMap(mappedScores);
        setStep('compare');
      } else {
        toast.error('Không thể tải dữ liệu so sánh');
      }
    } catch (error) {
      toast.error('Lỗi khi so sánh homestay');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('select');
    setComparisonData([]);
    setAiAnalysisMarkdown('');
    setScoreMap({});
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 'select' ? 'Chọn Homestay để So Sánh' : 'So Sánh Homestay'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 'select' ? (
            <SelectionView
              homestays={availableHomestays}
              selectedIds={selectedIds}
              onSelect={handleSelectHomestay}
              customerPreferences={customerPreferences}
              onCustomerPreferencesChange={setCustomerPreferences}
            />
          ) : (
            <ComparisonView
              homestays={comparisonData}
              aiAnalysisMarkdown={aiAnalysisMarkdown}
              scoreMap={scoreMap}
              onBooking={onBooking}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {step === 'select'
              ? `${selectedIds.length} / 4 đã chọn`
              : 'Kéo để cuộn →'}
          </div>
          <div className="flex gap-3">
            {step === 'compare' && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Quay Lại
              </button>
            )}
            <button
              onClick={step === 'select' ? handleCompare : onClose}
              disabled={isLoading || (step === 'select' && selectedIds.length < 2)}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {step === 'select' ? 'So Sánh' : 'Đóng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Selection View Component
function SelectionView({
  homestays,
  selectedIds,
  onSelect,
  customerPreferences,
  onCustomerPreferencesChange,
}: {
  homestays: Homestay[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  customerPreferences: string;
  onCustomerPreferencesChange: (value: string) => void;
}) {
  if (homestays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
        <p className="text-gray-600">Không có homestay nào để so sánh</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <label htmlFor="customer-preferences" className="block text-sm font-semibold text-gray-900 mb-2">
          Yêu cầu của bạn cho AI phân tích
        </label>
        <textarea
          id="customer-preferences"
          value={customerPreferences}
          onChange={(event) => onCustomerPreferencesChange(event.target.value)}
          placeholder="Ví dụ: ưu tiên gần biển, có hồ bơi, ngân sách tối đa 1.5 triệu/đêm, phù hợp gia đình có trẻ nhỏ..."
          rows={3}
          className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <p className="mt-2 text-xs text-gray-600">
          Gợi ý càng cụ thể thì phần chấm điểm AI càng sát nhu cầu của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {homestays.map((homestay) => {
          const isSelected = selectedIds.includes(homestay.id);
          const rating = homestay.averageRating ?? homestay.rating ?? 0;
          const totalReviews = homestay.totalReviews ?? homestay.reviewCount ?? 0;
          return (
            <div
              key={homestay.id}
              onClick={() => onSelect(homestay.id)}
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex gap-3">
                {/* Image */}
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  {homestay.images?.[0] ? (
                    <img
                      src={homestay.images[0]}
                      alt={homestay.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                      <Waves className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{homestay.name}</h3>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {homestay.districtName}, {homestay.provinceName}
                  </p>
                  <p className="text-sm font-medium text-blue-600">
                    {formatVndPrice(homestay.pricePerNight)}/đêm
                  </p>
                  {rating > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-xs">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-gray-700">
                        {rating.toFixed(1)} ({totalReviews})
                      </span>
                    </div>
                  )}
                </div>

                {/* Checkbox */}
                <div className="flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-5 h-5 rounded border-gray-300 text-blue-500"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Comparison View Component
function ComparisonView({
  homestays,
  aiAnalysisMarkdown,
  scoreMap,
  onBooking,
}: {
  homestays: Homestay[];
  aiAnalysisMarkdown: string;
  scoreMap: Record<string, HomestayCompareScore>;
  onBooking?: (homestayId: string) => void;
}) {
  const formatScore = (value?: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '-';
    return Math.round(value);
  };

  const rows: Array<{
    key: string;
    label: string;
    getValue: (h: Homestay) => React.ReactNode;
  }> = [
    {
      key: 'image',
      label: 'Hình Ảnh',
      getValue: (h) => (
        <div className="w-full h-40 rounded-lg overflow-hidden">
          {h.images?.[0] ? (
            <img src={h.images[0]} alt={h.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
              <Waves className="w-12 h-12 text-white" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Tên',
      getValue: (h) => <p className="font-semibold text-gray-900">{h.name}</p>,
    },
    {
      key: 'price',
      label: 'Giá/Đêm',
      getValue: (h) => (
        <p className="text-lg font-bold text-blue-600">{formatVndPrice(h.pricePerNight)}</p>
      ),
    },
    {
      key: 'location',
      label: 'Vị Trí',
      getValue: (h) => (
        <p className="text-sm text-gray-600">
          {h.address}, {h.districtName}, {h.provinceName}
        </p>
      ),
    },
    {
      key: 'rating',
      label: 'Đánh Giá',
      getValue: (h) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-gray-900">
              {(h.averageRating ?? h.rating ?? 0).toFixed(1)}
            </span>
          </div>
          <span className="text-xs text-gray-500">({h.totalReviews ?? h.reviewCount ?? 0} bình luận)</span>
        </div>
      ),
    },
    {
      key: 'aiScores',
      label: 'Điểm AI',
      getValue: (h) => {
        const score = scoreMap[h.id];

        if (!score) {
          return <p className="text-gray-500 text-sm">Chưa có dữ liệu điểm AI</p>;
        }

        return (
          <div className="space-y-2">
            <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
              Tổng hợp: {formatScore(score.matchScore)}/100
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                Giá: {formatScore(score.priceScore)}/10
              </span>
              <span className="px-2 py-1 rounded-full bg-cyan-50 text-cyan-700">
                Tiện nghi: {formatScore(score.amenityScore)}/10
              </span>
              <span className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                Vị trí: {formatScore(score.locationScore)}/10
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'guests',
      label: 'Tối Đa Khách',
      getValue: (h) => (
        <div className="flex items-center gap-2 text-gray-700">
          <Users className="w-4 h-4" />
          {h.maxGuests}
        </div>
      ),
    },
    {
      key: 'bedrooms',
      label: 'Phòng Ngủ',
      getValue: (h) => (
        <div className="flex items-center gap-2 text-gray-700">
          <Bed className="w-4 h-4" />
          {h.bedrooms || '-'}
        </div>
      ),
    },
    {
      key: 'bathrooms',
      label: 'Phòng Tắm',
      getValue: (h) => (
        <p className="text-gray-700">{h.bathrooms || '-'}</p>
      ),
    },
    {
      key: 'area',
      label: 'Diện Tích (m²)',
      getValue: (h) => (
        <p className="text-gray-700">{h.area || '-'}</p>
      ),
    },
    {
      key: 'amenities',
      label: 'Tiện Nghi',
      getValue: (h) => (
        <div className="space-y-1">
          {h.amenities && h.amenities.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {h.amenities.slice(0, 5).map((amenity, idx) => (
                <span
                  key={idx}
                  className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                >
                  {amenity}
                </span>
              ))}
              {h.amenities.length > 5 && (
                <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  +{h.amenities.length - 5} khác
                </span>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Không có tiện nghi nào</p>
          )}
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Mô Tả',
      getValue: (h) => (
        <p className="text-sm text-gray-600 line-clamp-2">{h.description || '-'}</p>
      ),
    },
    {
      key: 'deposit',
      label: 'Cọc %',
      getValue: (h) => (
        <p className="text-gray-700 font-medium">{h.depositPercentage}%</p>
      ),
    },
    {
      key: 'booking',
      label: 'Hành Động',
      getValue: (h) => (
        <button
          onClick={() => onBooking?.(h.id)}
          className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all font-medium text-sm"
        >
          Đặt Ngay
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {aiAnalysisMarkdown && (
        <div className="mx-6 mt-4 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiAnalysisMarkdown}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-4 font-semibold text-gray-900 bg-gray-50 w-32 sticky left-0 z-10 min-w-max">
                  {row.label}
                </td>
                {homestays.map((h) => (
                  <td
                    key={`${row.key}-${h.id}`}
                    className="px-4 py-4 text-sm align-top min-w-64 w-80"
                  >
                    {row.getValue(h)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
