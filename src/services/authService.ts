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

// TODO: Replace with actual API endpoint when backend is ready
const API_BASE_URL = 'http://localhost:3000/api';

// MOCK USERS for development (remove when backend is ready)
const MOCK_USERS = [
  {
    id: '1',
    email: 'customer@test.com',
    password: 'Customer123!',
    name: 'Nguyễn Văn A',
    role: 'customer' as const,
  },
  {
    id: '2',
    email: 'owner@test.com',
    password: 'Owner123!',
    name: 'Trần Thị B',
    role: 'owner' as const,
  },
  {
    id: '3',
    email: 'staff@test.com',
    password: 'Staff123!',
    name: 'Lê Văn C',
    role: 'staff' as const,
  },
  {
    id: '4',
    email: 'admin@test.com',
    password: 'Admin123!',
    name: 'Phạm Thị D',
    role: 'admin' as const,
  },
];

// ⚠️ Flag to enable/disable mock authentication
// Set to FALSE when backend is ready
const USE_MOCK_AUTH = true;

export const authService = {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    console.log('=== AUTH SERVICE ===');
    console.log('USE_MOCK_AUTH:', USE_MOCK_AUTH);
    console.log('Credentials:', credentials);

    // MOCK AUTHENTICATION - Remove when backend is ready
    if (USE_MOCK_AUTH) {
      console.log('✅ Using MOCK authentication');
      
      return new Promise((resolve) => {
        setTimeout(() => {
          const user = MOCK_USERS.find(
            (u) => u.email === credentials.email && u.password === credentials.password
          );

          if (user) {
            const mockToken = `mock_token_${user.id}_${Date.now()}`;
            const userData = {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            };

            // Store token and user data
            const storage = credentials.rememberMe ? localStorage : sessionStorage;
            storage.setItem('authToken', mockToken);
            storage.setItem('userData', JSON.stringify(userData));

            console.log('✅ Login successful:', userData);

            resolve({
              success: true,
              token: mockToken,
              user: userData,
              message: `Đăng nhập thành công! (Mock - ${user.role})`,
            });
          } else {
            console.log('❌ Login failed: Invalid credentials');
            resolve({
              success: false,
              message: 'Email hoặc mật khẩu không chính xác.',
            });
          }
        }, 500); // Simulate network delay
      });
    }

    // REAL API CALL - Uncomment when backend is ready
    console.log('⚠️ Using REAL API authentication');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store token if remember me is checked
        const storage = credentials.rememberMe ? localStorage : sessionStorage;
        if (data.token) {
          storage.setItem('authToken', data.token);
        }
        if (data.user) {
          storage.setItem('userData', JSON.stringify(data.user));
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
    // MOCK REGISTRATION
    if (USE_MOCK_AUTH) {
      return new Promise((resolve) => {
        setTimeout(() => {
          // Check if email already exists
          const existingUser = MOCK_USERS.find((u) => u.email === data.email);
          
          if (existingUser) {
            resolve({
              success: false,
              message: 'Email đã được sử dụng.',
            });
            return;
          }

          const newUser = {
            id: `${MOCK_USERS.length + 1}`,
            email: data.email,
            name: data.name,
            role: data.role,
          };

          const mockToken = `mock_token_${newUser.id}_${Date.now()}`;

          // Store token and user data
          localStorage.setItem('authToken', mockToken);
          localStorage.setItem('userData', JSON.stringify(newUser));

          resolve({
            success: true,
            token: mockToken,
            user: newUser,
            message: 'Đăng ký thành công!',
          });
        }, 500);
      });
    }

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
    // MOCK FORGOT PASSWORD
    if (USE_MOCK_AUTH) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const user = MOCK_USERS.find((u) => u.email === email);
          
          if (user) {
            resolve({
              success: true,
              message: 'Email khôi phục mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.',
            });
          } else {
            resolve({
              success: false,
              message: 'Email không tồn tại trong hệ thống.',
            });
          }
        }, 500);
      });
    }

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
    // MOCK RESET PASSWORD
    if (USE_MOCK_AUTH) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: 'Mật khẩu đã được đặt lại thành công!',
          });
        }, 500);
      });
    }

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
