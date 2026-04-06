export interface LocalExperience {
  id: string;
  homestayId?: string;
  homestayName?: string;
  categoryId?: string;
  categoryName?: string;
  name: string;
  description?: string;
  price?: number;
  unit?: string;
  imageUrl?: string;
  status?: string;
  isActive: boolean;
}

export interface ExperienceCategory {
  id: string;
  name: string;
  type?: string;
  description?: string;
  iconUrl?: string;
  status?: string;
  isActive?: boolean;
}

export interface ServiceCategoryPayload {
  name: string;
  type?: string;
  description?: string;
  iconUrl?: string;
  isActive?: boolean;
}

export interface ExperiencePayload {
  homestayId: string;
  categoryId: string;
  name: string;
  description?: string;
  price?: number;
  unit?: string;
  imageUrl?: string;
}
