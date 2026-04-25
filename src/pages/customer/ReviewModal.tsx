import { useState } from 'react';
import { Star, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { reviewService } from '../../services/reviewService';
import type { Review, CreateReviewPayload, UpdateReviewPayload } from '../../services/reviewService';

interface Props {
  // Khi tạo mới: truyền bookingId + homestayName
  bookingId?: string;
  homestayName?: string;
  // Khi sửa: truyền existing review
  existing?: Review;
  onClose: () => void;
  onSuccess: () => void;
}

const RATING_LABELS: Record<string, string> = {
  rating: 'Tổng quan',
  cleanlinessRating: 'Vệ sinh',
  locationRating: 'Vị trí',
  valueRating: 'Giá trị',
  communicationRating: 'Giao tiếp',
};

const RATING_KEYS = ['rating', 'cleanlinessRating', 'locationRating', 'valueRating', 'communicationRating'] as const;

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className="focus:outline-none"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              s <= (hovered || value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewModal({ bookingId, homestayName, existing, onClose, onSuccess }: Props) {
  const isEdit = !!existing;

  const [ratings, setRatings] = useState({
    rating: existing?.rating ?? 0,
    cleanlinessRating: existing?.cleanlinessRating ?? 0,
    locationRating: existing?.locationRating ?? 0,
    valueRating: existing?.valueRating ?? 0,
    communicationRating: existing?.communicationRating ?? 0,
  });
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [saving, setSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const setRating = (key: keyof typeof ratings, val: number) =>
    setRatings(prev => ({ ...prev, [key]: val }));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files || []);
    setSelectedFiles(files);
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };

  const removeImage = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
  };

  const validate = () => {
    for (const key of RATING_KEYS) {
      if (ratings[key] === 0) {
        toast.error(`Vui lòng chọn điểm cho "${RATING_LABELS[key]}"`);
        return false;
      }
    }
    if (!comment.trim()) {
      toast.error('Vui lòng nhập nhận xét');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit && existing) {
        const payload: UpdateReviewPayload = { ...ratings, comment, imageFiles: selectedFiles };
        const res = await reviewService.update(existing.id, payload);
        if (res.success) {
          toast.success(res.message);
          onSuccess();
        } else {
          toast.error(res.message);
        }
      } else {
        const payload: CreateReviewPayload = { bookingId: bookingId!, ...ratings, comment, imageFiles: selectedFiles };
        const res = await reviewService.create(payload);
        if (res.success) {
          toast.success(res.message);
          onSuccess();
        } else {
          toast.error(res.message);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit
    ? `Sửa đánh giá — ${existing?.homestayName}`
    : `Đánh giá — ${homestayName}`;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Rating rows */}
          {RATING_KEYS.map(key => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 w-28">{RATING_LABELS[key]}</span>
              <StarPicker value={ratings[key]} onChange={v => setRating(key, v)} />
              <span className="text-sm text-gray-500 w-6 text-right">{ratings[key] > 0 ? ratings[key] : ''}</span>
            </div>
          ))}

          {/* Comment */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Nhận xét</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              placeholder="Chia sẻ trải nghiệm của bạn..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Hình ảnh (Tùy chọn)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-cyan-500 transition-colors cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="image-input"
              />
              <label htmlFor="image-input" className="cursor-pointer block">
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-cyan-600">Chọn ảnh</span> hoặc kéo thả
                </div>
                <p className="text-xs text-gray-500 mt-1">Tối đa 5 ảnh, định dạng PNG/JPG/WebP</p>
              </label>
            </div>

            {/* Image Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isEdit && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Sau khi sửa, đánh giá sẽ chờ kiểm duyệt lại trước khi hiển thị.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium text-sm"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold text-sm disabled:opacity-60 flex items-center gap-2"
          >
            {saving && (
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isEdit ? 'Lưu thay đổi' : 'Gửi đánh giá'}
          </button>
        </div>
      </div>
    </div>
  );
}
