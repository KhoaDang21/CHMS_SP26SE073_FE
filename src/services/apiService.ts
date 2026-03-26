import { apiConfig } from "../config/apiConfig";
import { authService } from './authService';


class ApiService {
  private baseURL: string;
  private timeout: number;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.baseURL = apiConfig.baseURL;
    this.timeout = apiConfig.timeout;
  }

  private getToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  private async refreshTokenWithLock(): Promise<string | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = authService.refreshAccessToken().finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
  }

  private async parseResponseBody<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    let token = this.getToken();

    if (token && authService.isTokenExpired()) {
      token = await this.refreshTokenWithLock();
    }
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      let response = await fetch(`${this.baseURL}${endpoint}`, {
        ...config,
        signal: controller.signal,
      });

      if (response.status === 401 && this.getToken()) {
        const refreshedToken = await this.refreshTokenWithLock();

        if (refreshedToken) {
          const retryHeaders: HeadersInit = {
            ...(config.headers as Record<string, string>),
            Authorization: `Bearer ${refreshedToken}`,
          };

          response = await fetch(`${this.baseURL}${endpoint}`, {
            ...config,
            headers: retryHeaders,
            signal: controller.signal,
          });
        }
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          authService.clearAuthData();
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params 
      ? '?' + new URLSearchParams(params).toString() 
      : '';
    return this.request<T>(`${endpoint}${queryString}`, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = this.getToken();
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return this.parseResponseBody<T>(response);
  }

  async postForm<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = this.getToken();

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP Error: ${response.status}`);
    }

    return this.parseResponseBody<T>(response);
  }

  async putForm<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = this.getToken();

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP Error: ${response.status}`);
    }

    return this.parseResponseBody<T>(response);
  }
}

export const apiService = new ApiService();