import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Home, MapPin, DollarSign, Image, Sparkles, FileText } from 'lucide-react';
import type { CreateHomestayDTO, District } from '../../types/homestay.types';
import type { Amenity } from '../../types/amenity.types';
import { amenityService } from '../../services/amenityService';
import { districtService } from '../../services/districtService';
import { authService } from '../../services/authService';

interface CreateHomestayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateHomestayDTO) => void;
  loading?: boolean;
}

export default function CreateHomestayModal({ isOpen, onClose, onSubmit, loading }: CreateHomestayModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  
  const [formData, setFormData] = useState<Partial<CreateHomestayDTO>>({
    name: '',
    description: '',
    pricePerNight: 0,
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    area: 50,
    cancellationPolicy: 'Miễn phí hủy trước 24h. Sau đó phí hủy 50%.',
    houseRules: 'Không hút thuốc. Không thú cưng. Giờ nhận phòng: 14:00. Giờ trả phòng: 12:00.',
    amenityIds: [],
    address: '',
    districtId: '',
    latitude: 10.0,
    longitude: 107.0,
    images: [],
  });
  const [_selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadAmenities();
      loadDistricts();
    }
  }, [isOpen]);

  const loadAmenities = async () => {
    try {
      const data = await amenityService.getAllAmenities();
      console.log('Loaded amenities:', data);
      setAmenities(data); // Show all amenities for admin
    } catch (error) {
      console.error('Error loading amenities:', error);
    }
  };

  const loadDistricts = async () => {
    try {
      const data = await districtService.getAllDistricts();
      console.log('Loaded districts:', data);
      setDistricts(data);
    } catch (error) {
      console.error('Error loading districts:', error);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
      name: '',
      description: '',
      pricePerNight: 0,
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      area: 50,
      cancellationPolicy: 'Miễn phí hủy trước 24h. Sau đó phí hủy 50%.',
      houseRules: 'Không hút thuốc. Không thú cưng. Giờ nhận phòng: 14:00. Giờ trả phòng: 12:00.',
      amenityIds: [],
      address: '',
      districtId: '',
      latitude: 10.0,
      longitude: 107.0,
      images: [],
    });
    setSelectedFiles([]);
    setImagePreviews([]);
    onClose();
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser?.id) {
      console.error('No user logged in');
      return;
    }

    const payload: CreateHomestayDTO = {
      ownerId: currentUser.id,
      name: formData.name!,
      description: formData.description!,
      pricePerNight: formData.pricePerNight!,
      maxGuests: formData.maxGuests!,
      bedrooms: formData.bedrooms!,
      bathrooms: formData.bathrooms!,
      area: formData.area || 50,
      address: formData.address!,
      districtId: formData.districtId!,
      cancellationPolicy: formData.cancellationPolicy!,
      houseRules: formData.houseRules!,
      latitude: formData.latitude || 10.0,
      longitude: formData.longitude || 107.0,
      amenityIds: formData.amenityIds || [],
      images: [],
    };
    
    console.log('Submitting homestay payload:', payload);
    onSubmit(payload);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    setSelectedFiles(prev => [...prev, ...newFiles]);

    // Create preview URLs
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name?.trim() !== '' && formData.description?.trim() !== '';
      case 2:
        return (formData.pricePerNight || 0) > 0 && (formData.bedrooms || 0) > 0 && (formData.bathrooms || 0) > 0 && (formData.maxGuests || 0) > 0 && (formData.area || 0) > 0;
      case 3:
        return formData.address?.trim() !== '' && formData.districtId?.trim() !== '' && (formData.latitude || 0) !== 0 && (formData.longitude || 0) !== 0;
      case 4:
        return true; // Amenities are optional
      case 5:
        return true; // Policies are pre-filled
      default:
        return false;
    }
  };

  const steps = [
    { number: 1, title: 'Thông tin cơ bản', icon: Home },
    { number: 2, title: 'Chi tiết phòng', icon: DollarSign },
    { number: 3, title: 'Vị trí', icon: MapPin },
    { number: 4, title: 'Tiện ích', icon: Sparkles },
    { number: 5, title: 'Chính sách & Hoàn tất', icon: FileText },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Thêm Homestay Mới</h2>
            <p className="text-sm text-gray-500 mt-1">Bước {currentStep} / 5: {steps[currentStep - 1].title}</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isActive 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs mt-2 text-center hidden md:block ${
                      isActive ? 'text-blue-600 font-medium' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 transition-colors ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên homestay <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="VD: Sunrise Beach Villa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mô tả chi tiết về homestay, vị trí, đặc điểm nổi bật..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Room Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Giá thuê mỗi đêm (VNĐ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.pricePerNight || ''}
                  onChange={(e) => setFormData({ ...formData, pricePerNight: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="2500000"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diện tích (m²) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.area || ''}
                  onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="50"
                  min="10"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số phòng ngủ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số phòng tắm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số khách tối đa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.maxGuests}
                    onChange={(e) => setFormData({ ...formData, maxGuests: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Địa chỉ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123 Trần Phú"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quận/Huyện <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.districtId}
                  onChange={(e) => setFormData({ ...formData, districtId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Chọn quận/huyện</option>
                  {districts.map(district => (
                    <option key={district.id} value={district.id}>
                      {district.name} - {district.provinceName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vĩ độ (Latitude) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude || ''}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? Number(e.target.value) : 10.0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="12.245678"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kinh độ (Longitude) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude || ''}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? Number(e.target.value) : 107.0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="109.198765"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Amenities */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn tiện ích cho homestay
                </label>
                {amenities.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">Chưa có tiện ích nào</p>
                    <p className="text-sm text-gray-500">Hãy thêm tiện ích từ trang Quản lý tiện ích</p>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <select
                        multiple
                        value={formData.amenityIds || []}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
                          setFormData({ ...formData, amenityIds: selected });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[200px]"
                        size={Math.min(amenities.length, 8)}
                      >
                        {amenities.map((amenity) => (
                          <option key={amenity.id} value={amenity.id} className="py-2 px-3">
                            {amenity.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        Giữ Ctrl (Windows) hoặc Cmd (Mac) để chọn nhiều tiện ích
                      </p>
                    </div>

                    {/* Selected amenities preview */}
                    {formData.amenityIds && formData.amenityIds.length > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Đã chọn {formData.amenityIds.length} tiện ích:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {formData.amenityIds.map((amenityId) => {
                            const amenity = amenities.find(a => a.id === amenityId);
                            return amenity ? (
                              <span
                                key={amenityId}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-blue-200 rounded-full text-sm"
                              >
                                <Check className="w-3 h-3 text-blue-600" />
                                {amenity.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Policies & Images */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chính sách hủy phòng
                </label>
                <textarea
                  value={formData.cancellationPolicy}
                  onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nội quy nhà
                </label>
                <textarea
                  value={formData.houseRules}
                  onChange={(e) => setFormData({ ...formData, houseRules: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Hình ảnh (tùy chọn)</h3>
                  <label className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm flex items-center gap-1 cursor-pointer">
                    <Image className="w-4 h-4" />
                    <span>Chọn ảnh</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
                
                {imagePreviews.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="opacity-0 group-hover:opacity-100 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Chưa có hình ảnh</p>
                    <p className="text-xs text-gray-400 mt-1">Nhấn "Chọn ảnh" để tải lên</p>
                  </div>
                )}
                
                {imagePreviews.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Đã chọn {imagePreviews.length} ảnh. Ảnh sẽ được tải lên sau khi tạo homestay.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              currentStep === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Quay lại
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            
            {currentStep < 5 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  canProceed()
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Tiếp tục
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !canProceed()}
                className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  loading || !canProceed()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Tạo Homestay
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
