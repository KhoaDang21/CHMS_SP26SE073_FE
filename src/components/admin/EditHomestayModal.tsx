import { useEffect, useMemo, useState } from 'react';
import { X, MapPin, Sparkles, Image, Star } from 'lucide-react';
import type { Amenity } from '../../types/amenity.types';
import type { District, Homestay, HomestayImage, UpdateHomestayDTO } from '../../types/homestay.types';
import { adminAmenityService } from '../../services/adminAmenityService';
import { districtService } from '../../services/districtService';
import { homestayService } from '../../services/homestayService';
import { toast } from 'sonner';

interface EditHomestayModalProps {
  isOpen: boolean;
  homestay: Homestay | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateHomestayDTO, imageFiles: File[]) => void;
  onAmenitiesUpdated?: () => void;
}

const DEFAULT_CANCELLATION_POLICY = 'Miễn phí hủy trước 24h. Sau đó phí hủy 50%.';
const DEFAULT_HOUSE_RULES = 'Không hút thuốc. Không thú cưng. Giờ nhận phòng: 14:00. Giờ trả phòng: 12:00.';

const toImageUrls = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && 'imageUrl' in item) {
        const url = (item as { imageUrl?: string }).imageUrl;
        return (url || '').trim();
      }
      return '';
    })
    .filter(Boolean);
};

const normalizeText = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const resolveAmenityIds = (homestay: Homestay, allAmenities: Amenity[]): string[] => {
  const directIds = Array.isArray(homestay.amenityIds)
    ? homestay.amenityIds.map((id) => String(id ?? '').trim()).filter(Boolean)
    : [];

  const rawAmenities = Array.isArray(homestay.amenities) ? homestay.amenities : [];

  const idsFromObjects = rawAmenities
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      const source = item as { id?: unknown; amenityId?: unknown };
      return String(source.id ?? source.amenityId ?? '').trim();
    })
    .filter(Boolean);

  const namesFromHomestay = new Set<string>([
    ...(Array.isArray(homestay.amenityNames) ? homestay.amenityNames : []),
    ...rawAmenities.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'name' in item) {
        return String((item as { name?: unknown }).name ?? '');
      }
      return '';
    }),
  ].map(normalizeText).filter(Boolean));

  const idsFromNames = allAmenities
    .filter((amenity) => namesFromHomestay.has(normalizeText(amenity.name)))
    .map((amenity) => amenity.id);

  return Array.from(new Set([...directIds, ...idsFromObjects, ...idsFromNames]));
};

export default function EditHomestayModal({
  isOpen,
  homestay,
  loading,
  onClose,
  onSubmit,
  onAmenitiesUpdated,
}: EditHomestayModalProps) {
  const [districts, setDistricts] = useState<District[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [districtError, setDistrictError] = useState('');

  const [formData, setFormData] = useState<UpdateHomestayDTO>({
    name: '',
    description: '',
    pricePerNight: 0,
    maxGuests: 1,
    bedrooms: 1,
    bathrooms: 1,
    area: 10,
    depositPercentage: 20,
    cancellationPolicy: DEFAULT_CANCELLATION_POLICY,
    houseRules: DEFAULT_HOUSE_RULES,
    districtId: '',
    address: '',
    latitude: 10.0,
    longitude: 107.0,
    amenityIds: [],
    images: [],
  });

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('Cannot read file preview'));
      };
      reader.onerror = () => reject(reader.error || new Error('FileReader error'));
      reader.readAsDataURL(file);
    });
  };

  const buildPreview = async (file: File): Promise<string> => {
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        bitmap.close();
        throw new Error('No canvas context');
      }

      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      return canvas.toDataURL('image/jpeg', 0.92);
    } catch {
      return fileToDataUrl(file);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...newFiles]);

    Promise.all(newFiles.map((file) => buildPreview(file)))
      .then((previews) => {
        setImagePreviews((prev) => [...prev, ...previews]);
      })
      .catch(() => {
        // Keep UI responsive if a preview fails.
      });
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const setThumbnailImage = (index: number) => {
    setExistingImageUrls((prev) => {
      if (index <= 0 || index >= prev.length) return prev;
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      next.unshift(picked);
      return next;
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    const loadLookupData = async () => {
      try {
        const [districtData, amenityData] = await Promise.all([
          districtService.getAllDistricts(),
          adminAmenityService.getAllAmenities(),
        ]);

        setDistricts(districtData);
        setAmenities(amenityData);
        if (!districtData.length) {
          setDistrictError('Không tải được danh sách quận/huyện từ API. Bạn có thể nhập District ID thủ công bên dưới.');
        } else {
          setDistrictError('');
        }
      } catch (error) {
        console.error('Error loading lookup data:', error);
        setDistrictError('Không kết nối được API district. Bạn có thể nhập District ID thủ công bên dưới.');
      }
    };

    loadLookupData();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !homestay) return;

    const imageUrls = [
      ...toImageUrls(homestay.imageUrls),
      ...toImageUrls(homestay.images),
    ].filter((value, index, arr) => arr.indexOf(value) === index);

    setExistingImageUrls(imageUrls);
    setSelectedFiles([]);
    setImagePreviews([]);

    setFormData({
      name: homestay.name || '',
      description: homestay.description || '',
      pricePerNight: Number(homestay.pricePerNight || 0),
      maxGuests: Number(homestay.maxGuests || 1),
      bedrooms: Number(homestay.bedrooms || 1),
      bathrooms: Number(homestay.bathrooms || 1),
      area: Number(homestay.area || 10),
      depositPercentage: Number(homestay.depositPercentage ?? 20),
      cancellationPolicy: homestay.cancellationPolicy || DEFAULT_CANCELLATION_POLICY,
      houseRules: homestay.houseRules || DEFAULT_HOUSE_RULES,
      districtId: homestay.districtId || '',
      address: homestay.address || '',
      latitude: Number(homestay.latitude || 10.0),
      longitude: Number(homestay.longitude || 107.0),
      amenityIds: resolveAmenityIds(homestay, amenities),
      images: imageUrls.map((imageUrl, index) => ({
        imageUrl,
        caption: '',
        isPrimary: index === 0,
      })),
    });
  }, [isOpen, homestay, amenities]);

  useEffect(() => {
    if (!isOpen || !homestay) return;
    if (formData.districtId || districts.length === 0) return;

    const districtName = (homestay.districtName || '').trim().toLowerCase();
    const provinceName = (homestay.provinceName || '').trim().toLowerCase();

    const matchedDistrict = districts.find((district) => {
      const dName = (district.name || '').trim().toLowerCase();
      const pName = (district.provinceName || '').trim().toLowerCase();

      if (!districtName) return false;
      if (dName !== districtName) return false;
      if (provinceName && pName && pName !== provinceName) return false;
      return true;
    });

    if (matchedDistrict?.id) {
      setFormData((prev) => ({ ...prev, districtId: matchedDistrict.id }));
    }
  }, [isOpen, homestay, districts, formData.districtId]);

  const canSubmit = useMemo(() => {
    return Boolean(
      formData.name.trim() &&
        formData.description.trim() &&
        formData.address.trim() &&
        formData.districtId &&
        formData.pricePerNight > 0 &&
        formData.maxGuests > 0 &&
        formData.bedrooms > 0 &&
        formData.bathrooms > 0 &&
        formData.area > 0,
    );
  }, [formData]);

  const toggleAmenity = (amenityId: string) => {
    setFormData((prev) => {
      const exists = prev.amenityIds.includes(amenityId);
      return {
        ...prev,
        amenityIds: exists
          ? prev.amenityIds.filter((id) => id !== amenityId)
          : [...prev.amenityIds, amenityId],
      };
    });
  };

  const handleSubmit = async () => {
    if (!homestay) return;

    const existingImageItems: HomestayImage[] = existingImageUrls
      .map((imageUrl) => imageUrl.trim())
      .filter(Boolean)
      .map((imageUrl, index) => ({ imageUrl, caption: '', isPrimary: index === 0 }));

    const amenityIds = formData.amenityIds;

    onSubmit({
      ...formData,
      images: existingImageItems,
    }, selectedFiles);

    // Update amenities separately within the modal
    if (amenityIds && Array.isArray(amenityIds)) {
      try {
        console.log('Updating amenities within modal:', { homestayId: homestay.id, amenityIds });
        const amenityResult = await homestayService.updateAdminHomestayAmenities(homestay.id, amenityIds);
        console.log('Amenity update result:', amenityResult);
        if (amenityResult === null || amenityResult?.success === false) {
          toast.warning('Cập nhật tiện ích có lỗi: ' + (amenityResult?.message || 'Lỗi API'));
        } else {
          console.log('Amenities updated successfully');
          if (onAmenitiesUpdated) {
            onAmenitiesUpdated();
          }
        }
      } catch (error: any) {
        console.error('Error updating amenities:', error);
        toast.error('Lỗi cập nhật tiện ích: ' + (error?.message || 'Không xác định'));
      }
    }
  };

  if (!isOpen || !homestay) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Chỉnh sửa Homestay</h2>
            <p className="text-sm text-gray-500 mt-1">Cập nhật thông tin cho {homestay.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tên homestay *</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quận/Huyện *</label>
              <select
                value={formData.districtId}
                onChange={(e) => setFormData((prev) => ({ ...prev, districtId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Chọn quận/huyện</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name} - {district.provinceName}
                  </option>
                ))}
              </select>
              {districts.length === 0 && (
                <p className="mt-1 text-xs text-red-500">Không tải được danh sách quận/huyện. Vui lòng kiểm tra API /api/districts.</p>
              )}
            </div>

            {districtError && (
              <div>
                <p className="text-xs text-red-600 mb-2">{districtError}</p>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mã quận/huyện (District ID - UUID) *</label>
                <input
                  type="text"
                  value={formData.districtId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, districtId: e.target.value }))}
                  placeholder="Nhập districtId, ví dụ: 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả *</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ *</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Giá/đêm *</label>
              <input
                type="number"
                min={0}
                value={formData.pricePerNight}
                onChange={(e) => setFormData((prev) => ({ ...prev, pricePerNight: Number(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Khách tối đa *</label>
              <input
                type="number"
                min={1}
                value={formData.maxGuests}
                onChange={(e) => setFormData((prev) => ({ ...prev, maxGuests: Number(e.target.value) || 1 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phòng ngủ *</label>
              <input
                type="number"
                min={1}
                value={formData.bedrooms}
                onChange={(e) => setFormData((prev) => ({ ...prev, bedrooms: Number(e.target.value) || 1 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phòng tắm *</label>
              <input
                type="number"
                min={1}
                value={formData.bathrooms}
                onChange={(e) => setFormData((prev) => ({ ...prev, bathrooms: Number(e.target.value) || 1 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Diện tích (m2) *</label>
              <input
                type="number"
                min={1}
                value={formData.area}
                onChange={(e) => setFormData((prev) => ({ ...prev, area: Number(e.target.value) || 10 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tỷ lệ cọc (%) *</label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.depositPercentage}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    depositPercentage: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Latitude *</label>
              <input
                type="number"
                step="0.000001"
                value={formData.latitude}
                onChange={(e) => setFormData((prev) => ({ ...prev, latitude: Number(e.target.value) || 10 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Longitude *</label>
              <input
                type="number"
                step="0.000001"
                value={formData.longitude}
                onChange={(e) => setFormData((prev) => ({ ...prev, longitude: Number(e.target.value) || 107 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chính sách hủy</label>
            <textarea
              rows={2}
              value={formData.cancellationPolicy}
              onChange={(e) => setFormData((prev) => ({ ...prev, cancellationPolicy: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nội quy nhà</label>
            <textarea
              rows={2}
              value={formData.houseRules}
              onChange={(e) => setFormData((prev) => ({ ...prev, houseRules: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <label className="block text-sm font-medium text-gray-700">Tiện ích</label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {amenities.map((amenity) => {
                const selected = formData.amenityIds.includes(amenity.id);
                return (
                  <button
                    key={amenity.id}
                    type="button"
                    onClick={() => toggleAmenity(amenity.id)}
                    className={`px-3 py-2 text-left text-sm rounded-lg border transition-colors ${
                      selected
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {amenity.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Hình ảnh</h3>
              <input
                id="edit-homestay-image-input"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="edit-homestay-image-input"
                className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm flex items-center gap-1 cursor-pointer"
              >
                <Image className="w-4 h-4" />
                <span>Chọn ảnh</span>
              </label>
            </div>

            {existingImageUrls.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Ảnh hiện tại</p>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {existingImageUrls.map((url, index) => (
                    <div key={`${url}-${index}`} className="relative">
                      <img
                        src={url}
                        alt={`Current ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200 bg-gray-100"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format';
                        }}
                      />
                      {index === 0 ? (
                        <div className="absolute top-1 left-1 bg-amber-500/95 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Thumbnail
                        </div>
                      ) : (
                        <div className="absolute top-1 left-1 bg-gray-900/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                          {index + 1}
                        </div>
                      )}

                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => setThumbnailImage(index)}
                          className="absolute bottom-1 left-1 right-1 bg-white/95 text-[10px] text-gray-700 border border-gray-200 rounded px-1.5 py-1 hover:bg-amber-50 hover:border-amber-200"
                        >
                          Đặt làm thumbnail
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">Ảnh ở vị trí đầu tiên sẽ là thumbnail hiển thị chính.</p>
              </div>
            )}

            {imagePreviews.length > 0 ? (
              <div>
                <p className="text-sm text-gray-600 mb-2">Ảnh mới sẽ upload sau khi cập nhật</p>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-blue-200 bg-gray-100"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Bạn có thể chọn thêm ảnh mới, hệ thống sẽ giữ nguyên ảnh hiện tại.</p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Hủy
          </button>
          <button
            disabled={!canSubmit || loading}
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Đang cập nhật...' : 'Cập nhật Homestay'}
          </button>
        </div>
      </div>
    </div>
  );
}
