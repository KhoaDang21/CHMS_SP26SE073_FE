// Authentication configuration

export const authConfig = {
  // API Configuration
  api: {
    baseUrl: "http://163.227.230.54:8088/api",
    endpoints: {
      login: "/Auth/login",
      register: "/Auth/register",
      verifyOtp: "/Auth/verify-otp",
      logout: "/Auth/logout",
      forgotPassword: "/Auth/forgot-password",
      resetPassword: "/Auth/reset-password",
      refreshToken: "/Auth/refresh-token",
    },
  },

  // Token storage key
  tokenKey: "authToken",

  // Session timeout (in milliseconds)
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours

  // Password requirements
  passwordRequirements: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },

  // OAuth providers (for future implementation)
  oauthProviders: {
    google: {
      enabled: false,
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    },
    facebook: {
      enabled: false,
      clientId: import.meta.env.VITE_FACEBOOK_CLIENT_ID,
    },
  },

  // Redirect paths after login based on role
  redirectPaths: {
    customer: "/customer/dashboard",
    owner: "/owner/dashboard",
    staff: "/staff/dashboard",
    admin: "/admin/dashboard",
  },

  // Public routes that don't require authentication
  publicRoutes: [
    "/",
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/search",
    "/homestay/:id",
  ],
};
