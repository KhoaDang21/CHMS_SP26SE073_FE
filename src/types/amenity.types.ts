// Amenity related types

export type AmenityCategory = 
  | 'basic' 
  | 'kitchen' 
  | 'bathroom' 
  | 'entertainment' 
  | 'outdoor' 
  | 'safety' 
  | 'service' 
  | 'other';

export interface Amenity {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  category: AmenityCategory;
  iconUrl: string;
  isPremium: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAmenityDTO {
  name: string;
  category: AmenityCategory;
  iconUrl: string;
}

export interface UpdateAmenityDTO extends Partial<CreateAmenityDTO> {
  isActive?: boolean;
}

export interface AmenityStats {
  total: number;
  active: number;
  inactive: number;
  premium: number;
  byCategory: Record<AmenityCategory, number>;
}

export interface AmenityFilter {
  search?: string;
  category?: AmenityCategory | 'all';
  status?: 'all' | 'active' | 'inactive';
  isPremium?: boolean;
}
