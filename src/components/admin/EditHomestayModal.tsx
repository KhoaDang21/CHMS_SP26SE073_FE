import { useEffect, useMemo, useState } from 'react';
import { X, MapPin, Sparkles } from 'lucide-react';
import type { Amenity } from '../../types/amenity.types';
import type { District, Homestay, HomestayImage, UpdateHomestayDTO } from '../../types/homestay.types';
import { amenityService } from '../../services/amenityService';
import { districtService } from '../../services/districtService';

interface EditHomestayModalProps {
  isOpen: boolean;
  homestay: Homestay | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateHomestayDTO) => void;
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

export default function EditHomestayModal({
  isOpen,
  homestay,
  loading,
  onClose,
  onSubmit,
}: EditHomestayModalProps) {
  const [districts, setDistricts] = useState<District[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [imageUrlsText, setImageUrlsText] = useState('');
  const [districtError, setDistrictError] = useState('');

  const [formData, setFormData] = useState<UpdateHomestayDTO>({
    name: '',
    description: '',
    pricePerNight: 0,
    maxGuests: 1,
    bedrooms: 1,
    bathrooms: 1,
    area: 10,
    cancellationPolicy: DEFAULT_CANCELLATION_POLICY,
    houseRules: DEFAULT_HOUSE_RULES,
    districtId: '',
    address: '',
    latitude: 10.0,
    longitude: 107.0,
    amenityIds: [],
    images: [],
  });

  useEffect(() => {
    if (!isOpen) return;

    const loadLookupData = async () => {
      try {
        const [districtData, amenityData] = await Promise.all([
          districtService.getAllDistricts(),
          amenityService.getAllAmenities(),
        ]);

        setDistricts(districtData);
        setAmenities(amenityData);
        if (!districtData.length) {
          setDistrictError('Khong tai duoc danh sach quan/huyen tu API. Ban co the nhap District ID thu cong ben duoi.');
        } else {
          setDistrictError('');
        }
      } catch (error) {
        console.error('Error loading lookup data:', error);
        setDistrictError('Khong ket noi duoc API district. Ban co the nhap District ID thu cong ben duoi.');
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

    setImageUrlsText(imageUrls.join('\n'));

    setFormData({
      name: homestay.name || '',
      description: homestay.description || '',
      pricePerNight: Number(homestay.pricePerNight || 0),
      maxGuests: Number(homestay.maxGuests || 1),
      bedrooms: Number(homestay.bedrooms || 1),
      bathrooms: Number(homestay.bathrooms || 1),
      area: Number(homestay.area || 10),
      cancellationPolicy: homestay.cancellationPolicy || DEFAULT_CANCELLATION_POLICY,
      houseRules: homestay.houseRules || DEFAULT_HOUSE_RULES,
      districtId: homestay.districtId || '',
      address: homestay.address || '',
      latitude: Number(homestay.latitude || 10.0),
      longitude: Number(homestay.longitude || 107.0),
      amenityIds: homestay.amenityIds || [],
      images: imageUrls.map((imageUrl, index) => ({
        imageUrl,
        caption: '',
        isPrimary: index === 0,
      })),
    });
  }, [isOpen, homestay]);

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

  const handleSubmit = () => {
    const imageItems: HomestayImage[] = imageUrlsText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((imageUrl, index) => ({ imageUrl, caption: '', isPrimary: index === 0 }));

    onSubmit({
      ...formData,
      images: imageItems,
    });
  };

  if (!isOpen || !homestay) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Chinh sua Homestay</h2>
            <p className="text-sm text-gray-500 mt-1">Cap nhat thong tin cho {homestay.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ten homestay *</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quan/Huyen *</label>
              <select
                value={formData.districtId}
                onChange={(e) => setFormData((prev) => ({ ...prev, districtId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Chon quan/huyen</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name} - {district.provinceName}
                  </option>
                ))}
              </select>
              {districts.length === 0 && (
                <p className="mt-1 text-xs text-red-500">Khong tai duoc danh sach quan/huyen. Vui long kiem tra API /api/districts.</p>
              )}
            </div>

            {districtError && (
              <div>
                <p className="text-xs text-red-600 mb-2">{districtError}</p>
                <label className="block text-sm font-medium text-gray-700 mb-2">District ID (UUID) *</label>
                <input
                  type="text"
                  value={formData.districtId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, districtId: e.target.value }))}
                  placeholder="Nhap districtId, vi du: 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mo ta *</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dia chi *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Gia/ dem *</label>
              <input
                type="number"
                min={0}
                value={formData.pricePerNight}
                onChange={(e) => setFormData((prev) => ({ ...prev, pricePerNight: Number(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Khach toi da *</label>
              <input
                type="number"
                min={1}
                value={formData.maxGuests}
                onChange={(e) => setFormData((prev) => ({ ...prev, maxGuests: Number(e.target.value) || 1 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phong ngu *</label>
              <input
                type="number"
                min={1}
                value={formData.bedrooms}
                onChange={(e) => setFormData((prev) => ({ ...prev, bedrooms: Number(e.target.value) || 1 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phong tam *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Dien tich (m2) *</label>
              <input
                type="number"
                min={1}
                value={formData.area}
                onChange={(e) => setFormData((prev) => ({ ...prev, area: Number(e.target.value) || 10 }))}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Chinh sach huy</label>
            <textarea
              rows={2}
              value={formData.cancellationPolicy}
              onChange={(e) => setFormData((prev) => ({ ...prev, cancellationPolicy: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Noi quy nha</label>
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
              <label className="block text-sm font-medium text-gray-700">Tien ich</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Danh sach URL anh (moi dong 1 URL)</label>
            <textarea
              rows={4}
              value={imageUrlsText}
              onChange={(e) => setImageUrlsText(e.target.value)}
              placeholder="https://.../img1.jpg&#10;https://.../img2.jpg"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Anh dau tien se duoc gan la anh chinh (isPrimary = true).</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Huy
          </button>
          <button
            disabled={!canSubmit || loading}
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Dang cap nhat...' : 'Cap nhat Homestay'}
          </button>
        </div>
      </div>
    </div>
  );
}
