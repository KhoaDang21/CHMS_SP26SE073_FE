// Homestay Service - Handle homestay-related API calls

import { authConfig } from '../config/authConfig';
import type { DashboardStats, RevenueData, Homestay, Booking, Customer, Staff } from '../types/homestay.types';

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

export const homestayService = {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const data = await apiCall<{ success: boolean; data: DashboardStats }>('/Dashboard/stats');
      return data.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  /**
   * Get revenue data for charts
   */
  async getRevenueData(): Promise<RevenueData[]> {
    try {
      const data = await apiCall<{ success: boolean; data: RevenueData[] }>('/Dashboard/revenue');
      return data.data || [];
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      throw error;
    }
  },

  /**
   * Get all homestays
   */
  async getHomestays(): Promise<Homestay[]> {
    try {
      const data = await apiCall<{ success: boolean; data: Homestay[] }>('/Homestay/list');
      return data.data || [];
    } catch (error) {
      console.error('Error fetching homestays:', error);
      // Return empty array on error
      return [];
    }
  },

  /**
   * Get homestay by ID
   */
  async getHomestayById(id: string): Promise<Homestay> {
    try {
      const data = await apiCall<{ success: boolean; data: Homestay }>(`/Homestay/${id}`);
      return data.data;
    } catch (error) {
      console.error('Error fetching homestay:', error);
      throw error;
    }
  },

  /**
   * Get all bookings
   */
  async getBookings(): Promise<Booking[]> {
    try {
      const data = await apiCall<{ success: boolean; data: Booking[] }>('/Booking/list');
      return data.data || [];
    } catch (error) {
      console.error('Error fetching bookings:', error);
      return [];
    }
  },

  /**
   * Get all customers
   */
  async getCustomers(): Promise<Customer[]> {
    try {
      const data = await apiCall<{ success: boolean; data: Customer[] }>('/Customer/list');
      return data.data || [];
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  },

  /**
   * Get all staff
   */
  async getStaff(): Promise<Staff[]> {
    try {
      const data = await apiCall<{ success: boolean; data: Staff[] }>('/Staff/list');
      return data.data || [];
    } catch (error) {
      console.error('Error fetching staff:', error);
      return [];
    }
  },

  /**
   * Create new homestay
   */
  async createHomestay(homestayData: Partial<Homestay>): Promise<Homestay> {
    try {
      const data = await apiCall<{ success: boolean; data: Homestay }>('/Homestay/create', {
        method: 'POST',
        body: JSON.stringify(homestayData),
      });
      return data.data;
    } catch (error) {
      console.error('Error creating homestay:', error);
      throw error;
    }
  },

  /**
   * Update homestay
   */
  async updateHomestay(id: string, homestayData: Partial<Homestay>): Promise<Homestay> {
    try {
      const data = await apiCall<{ success: boolean; data: Homestay }>(`/Homestay/${id}`, {
        method: 'PUT',
        body: JSON.stringify(homestayData),
      });
      return data.data;
    } catch (error) {
      console.error('Error updating homestay:', error);
      throw error;
    }
  },

  /**
   * Delete homestay
   */
  async deleteHomestay(id: string): Promise<void> {
    try {
      await apiCall<{ success: boolean }>(`/Homestay/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting homestay:', error);
      throw error;
    }
  },

  /**
   * Update booking status
   */
  async updateBookingStatus(id: string, status: string): Promise<Booking> {
    try {
      const data = await apiCall<{ success: boolean; data: Booking }>(`/Booking/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return data.data;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  },
};
