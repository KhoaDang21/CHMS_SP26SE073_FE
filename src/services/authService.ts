// Auth Service - Handle authentication API calls

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'customer' | 'owner' | 'staff' | 'admin';
  };
  message?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'customer' | 'owner';
}

// TODO: Replace with actual API endpoint
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const authService = {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token if remember me is checked
        if (credentials.rememberMe && data.token) {
          localStorage.setItem('authToken', data.token);
        } else if (data.token) {
          sessionStorage.setItem('authToken', data.token);
        }
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.',
      };
    }
  },

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.',
      };
    }
  },

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
  },

  /**
   * Get current auth token
   */
  getToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      return await response.json();
    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        message: 'Đã xảy ra lỗi. Vui lòng thử lại.',
      };
    }
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      return await response.json();
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        message: 'Đã xảy ra lỗi. Vui lòng thử lại.',
      };
    }
  },
};
