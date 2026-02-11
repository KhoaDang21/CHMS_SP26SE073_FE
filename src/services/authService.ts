// Auth Service - Handle authentication API calls

import { authConfig } from '../config/authConfig';

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

export const authService = {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(`${authConfig.api.baseUrl}${authConfig.api.endpoints.login}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        }),
      });

      const apiResponse = await response.json();

      if (response.ok && apiResponse.success) {
        const storage = credentials.rememberMe ? localStorage : sessionStorage;

        const token = apiResponse.data?.accessToken || apiResponse.data?.token || apiResponse.token;
        const userData = apiResponse.data ? {
          id: apiResponse.data.id || apiResponse.data.email,
          email: apiResponse.data.email,
          name: apiResponse.data.fullName || apiResponse.data.name,
          role: apiResponse.data.role?.toLowerCase() as 'customer' | 'owner' | 'staff' | 'admin'
        } : undefined;

        if (token) {
          storage.setItem('authToken', token);
        }
        if (userData) {
          storage.setItem('userData', JSON.stringify(userData));
        }

        return {
          success: true,
          token: token,
          user: userData,
          message: apiResponse.message
        };
      }

      return {
        success: false,
        message: apiResponse.message || 'Đăng nhập thất bại'
      };
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
      const response = await fetch(`${authConfig.api.baseUrl}${authConfig.api.endpoints.register}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          fullName: data.name,        
          phoneNumber: data.phone
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Không lưu token ở đây vì cần verify OTP trước
        // Token sẽ được lưu sau khi verify OTP thành công
      }

      return result;
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
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
  },

  /**
   * Get current auth token
   */
  getToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  },

  /**
   * Get current user data
   */
  getUser(): LoginResponse['user'] | null {
    const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
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
      const response = await fetch(`${authConfig.api.baseUrl}${authConfig.api.endpoints.forgotPassword}`, {
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
      const response = await fetch(`${authConfig.api.baseUrl}${authConfig.api.endpoints.resetPassword}`, {
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

  /**
   * Verify OTP after registration
   */
  async verifyOtp(email: string, otpCode: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${authConfig.api.baseUrl}${authConfig.api.endpoints.verifyOtp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otpCode: otpCode
        }),
      });

      const apiResponse = await response.json();

      if (response.ok && apiResponse.success) {
        // OTP verified successfully, save token and user data
        const token = apiResponse.data?.accessToken || apiResponse.data?.token || apiResponse.token;
        const userData = apiResponse.data ? {
          id: apiResponse.data.id || apiResponse.data.email,
          email: apiResponse.data.email,
          name: apiResponse.data.fullName || apiResponse.data.name,
          role: apiResponse.data.role?.toLowerCase() as 'customer' | 'owner' | 'staff' | 'admin'
        } : undefined;

        if (token) {
          localStorage.setItem('authToken', token);
        }
        if (userData) {
          localStorage.setItem('userData', JSON.stringify(userData));
        }

        return {
          success: true,
          token: token,
          user: userData,
          message: apiResponse.message
        };
      }

      return {
        success: false,
        message: apiResponse.message || 'Mã OTP không hợp lệ'
      };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return {
        success: false,
        message: 'Đã xảy ra lỗi. Vui lòng thử lại.',
      };
    }
  },
};
