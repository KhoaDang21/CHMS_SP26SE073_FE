// Auth Service - Handle authentication API calls

import { authConfig } from "../config/authConfig";

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
    role: "customer" | "manager" | "staff" | "admin";
  };
  message?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: "customer" | "manager";
}

export const authService = {
  _extractUserId(apiData: any, token?: string | null): string | undefined {
    const tokenPayload = token ? this._parseJwt(token) : null;

    return (
      apiData?.userId ||
      apiData?.id ||
      apiData?.guid ||
      apiData?.user?.id ||
      tokenPayload?.userId ||
      tokenPayload?.sub ||
      tokenPayload?.nameid ||
      tokenPayload?.id ||
      tokenPayload?.[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
      ] ||
      apiData?.email
    );
  },

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(
        `${authConfig.api.baseUrl}${authConfig.api.endpoints.login}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        },
      );

      const apiResponse = await response.json();

      if (response.ok && apiResponse.success) {
        const storage = credentials.rememberMe ? localStorage : sessionStorage;

        const token =
          apiResponse.data?.accessToken ||
          apiResponse.data?.token ||
          apiResponse.token;
        const refreshToken = apiResponse.data?.refreshToken;
        const resolvedUserId = this._extractUserId(apiResponse.data, token);

        const userData = apiResponse.data
          ? {
              id: resolvedUserId || apiResponse.data.email,
              email: apiResponse.data.email,
              name: apiResponse.data.fullName || apiResponse.data.name,
              role: apiResponse.data.role?.toLowerCase() as
                | "customer"
                | "manager"
                | "staff"
                | "admin",
            }
          : undefined;

        if (token) {
          storage.setItem("authToken", token);
        }
        if (refreshToken) {
          storage.setItem("refreshToken", refreshToken);
        }
        if (userData) {
          storage.setItem("userData", JSON.stringify(userData));
        }

        // Notify toàn app biết user đã login
        window.dispatchEvent(new Event("auth-login"));

        return {
          success: true,
          token: token,
          user: userData,
          message: apiResponse.message,
        };
      }

      return {
        success: false,
        message: apiResponse.message || "Đăng nhập thất bại",
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: "Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.",
      };
    }
  },

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<LoginResponse> {
    try {
      const response = await fetch(
        `${authConfig.api.baseUrl}${authConfig.api.endpoints.register}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            fullName: data.name,
            phoneNumber: data.phone,
          }),
        },
      );

      const result = await response.json();

      if (response.ok && result.success) {
        // Không lưu token ở đây vì cần verify OTP trước
        // Token sẽ được lưu sau khi verify OTP thành công
      }

      return result;
    } catch (error) {
      console.error("Register error:", error);
      return {
        success: false,
        message: "Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.",
      };
    }
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const token = this.getToken();
    const refreshToken =
      localStorage.getItem("refreshToken") ||
      sessionStorage.getItem("refreshToken");

    try {
      // Call API logout để invalidate token trên server
      if (token && refreshToken) {
        await fetch(
          `${authConfig.api.baseUrl}${authConfig.api.endpoints.logout}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              accessToken: token,
              refreshToken: refreshToken,
            }),
          },
        );
      }
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      // Xóa tất cả token và userData khỏi storage
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      localStorage.removeItem("refreshToken");
      sessionStorage.removeItem("authToken");
      sessionStorage.removeItem("userData");
      sessionStorage.removeItem("refreshToken");
      // Notify toàn app biết user đã logout
      window.dispatchEvent(new Event("auth-logout"));
    }
  },

  /**
   * Get current auth token
   */
  getToken(): string | null {
    return (
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
    );
  },

  /**
   * Decode JWT payload (naive, no signature check)
   */
  _parseJwt(token: string) {
    try {
      const parts = token.split(".");
      if (parts.length < 2) return null;
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(
        decodeURIComponent(
          Array.prototype.map
            .call(
              decoded,
              (c: any) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2),
            )
            .join(""),
        ),
      );
    } catch (e) {
      return null;
    }
  },

  /**
   * Check if token is expired by 'exp' claim (seconds since epoch)
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    const payload = this._parseJwt(token);
    if (!payload || !payload.exp) return false; // unknown -> assume not expired
    const exp = Number(payload.exp);
    if (Number.isNaN(exp)) return false;
    const now = Math.floor(Date.now() / 1000);
    return now >= exp;
  },

  /**
   * Returns true if a valid (non-expired) token exists
   */
  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return !this.isTokenExpired();
  },

  /**
   * Get current user data
   */
  getUser(): LoginResponse["user"] | null {
    const userData =
      localStorage.getItem("userData") || sessionStorage.getItem("userData");

    if (!userData) return null;

    const parsedUser = JSON.parse(userData);
    const token = this.getToken();
    const resolvedUserId = this._extractUserId(parsedUser, token);

    // Auto-migrate stale userData where id was stored as email.
    if (resolvedUserId && parsedUser?.id !== resolvedUserId) {
      const updatedUser = { ...parsedUser, id: resolvedUserId };
      if (localStorage.getItem("userData")) {
        localStorage.setItem("userData", JSON.stringify(updatedUser));
      }
      if (sessionStorage.getItem("userData")) {
        sessionStorage.setItem("userData", JSON.stringify(updatedUser));
      }
      return updatedUser;
    }

    return parsedUser;
  },

  /**
   * Get current user data (alias for getUser)
   */
  getCurrentUser(): LoginResponse["user"] | null {
    return this.getUser();
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
  async forgotPassword(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(
        `${authConfig.api.baseUrl}${authConfig.api.endpoints.forgotPassword}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        },
      );

      return await response.json();
    } catch (error) {
      console.error("Forgot password error:", error);
      return {
        success: false,
        message: "Đã xảy ra lỗi. Vui lòng thử lại.",
      };
    }
  },

  /**
   * Reset password with OTP
   */
  async resetPassword(
    email: string,
    otpCode: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(
        `${authConfig.api.baseUrl}${authConfig.api.endpoints.resetPassword}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            otpCode: otpCode,
            newPassword: newPassword,
          }),
        },
      );

      return await response.json();
    } catch (error) {
      console.error("Reset password error:", error);
      return {
        success: false,
        message: "Đã xảy ra lỗi. Vui lòng thử lại.",
      };
    }
  },

  /**
   * Verify OTP after registration
   * BE: POST /api/auth/verify-otp
   * BE returns: ApiResponse (no data/token) — just success/fail message
   * After OTP verified, user must login separately to get token.
   */
  async verifyOtp(email: string, otpCode: string): Promise<LoginResponse> {
    try {
      const response = await fetch(
        `${authConfig.api.baseUrl}${authConfig.api.endpoints.verifyOtp}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            otpCode: otpCode,
          }),
        },
      );

      const apiResponse = await response.json();

      if (response.ok && apiResponse.success) {
        // BE does NOT return token on verify-otp — just confirms account activation.
        // Return success so FE can redirect to login.
        return {
          success: true,
          message: apiResponse.message ?? "Kích hoạt tài khoản thành công!",
        };
      }

      return {
        success: false,
        message: apiResponse.message || "Mã OTP không hợp lệ",
      };
    } catch (error) {
      console.error("Verify OTP error:", error);
      return {
        success: false,
        message: "Đã xảy ra lỗi. Vui lòng thử lại.",
      };
    }
  },
};
