// Amenity Service - Handle amenity-related API calls

import { authConfig } from '../config/authConfig';
import type { Amenity, CreateAmenityDTO, UpdateAmenityDTO, AmenityStats } from '../types/amenity.types';

const API_BASE_URL = authConfig.api.baseUrl;

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
};

// Helper function for authenticated API calls
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export const amenityService = {
  /**
   * Get all amenities
   */
  async getAllAmenities(): Promise<Amenity[]> {
    try {
      const data = await apiCall<{ success: boolean; data: Amenity[] }>('/Amenity/list');
      return data.data || [];
    } catch (error) {
      console.error('Error fetching amenities:', error);
      return [];
    }
  },

  /**
   * Get amenity statistics
   */
  async getAmenityStats(): Promise<AmenityStats> {
    try {
      const data = await apiCall<{ success: boolean; data: AmenityStats }>('/Amenity/stats');
      return data.data;
    } catch (error) {
      console.error('Error fetching amenity stats:', error);
      throw error;
    }
  },

  /**
   * Get amenity by ID
   */
  async getAmenityById(id: string): Promise<Amenity> {
    try {
      const data = await apiCall<{ success: boolean; data: Amenity }>(`/Amenity/${id}`);
      return data.data;
    } catch (error) {
      console.error('Error fetching amenity:', error);
      throw error;
    }
  },

  /**
   * Create new amenity
   */
  async createAmenity(amenityData: CreateAmenityDTO): Promise<Amenity> {
    try {
      const data = await apiCall<{ success: boolean; data: Amenity }>('/Amenity/create', {
        method: 'POST',
        body: JSON.stringify(amenityData),
      });
      return data.data;
    } catch (error) {
      console.error('Error creating amenity:', error);
      throw error;
    }
  },

  /**
   * Update amenity
   */
  async updateAmenity(id: string, amenityData: UpdateAmenityDTO): Promise<Amenity> {
    try {
      const data = await apiCall<{ success: boolean; data: Amenity }>(`/Amenity/${id}`, {
        method: 'PUT',
        body: JSON.stringify(amenityData),
      });
      return data.data;
    } catch (error) {
      console.error('Error updating amenity:', error);
      throw error;
    }
  },

  /**
   * Delete amenity
   */
  async deleteAmenity(id: string): Promise<void> {
    try {
      await apiCall<{ success: boolean }>(`/Amenity/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting amenity:', error);
      throw error;
    }
  },

  /**
   * Toggle amenity status (active/inactive)
   */
  async toggleAmenityStatus(id: string): Promise<Amenity> {
    try {
      const data = await apiCall<{ success: boolean; data: Amenity }>(`/Amenity/${id}/toggle-status`, {
        method: 'PATCH',
      });
      return data.data;
    } catch (error) {
      console.error('Error toggling amenity status:', error);
      throw error;
    }
  },
};
