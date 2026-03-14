export const apiConfig = {
  baseURL: import.meta.env.VITE_API_URL || "http://163.227.230.54:8088",
  timeout: 10000,

  endpoints: {
    auth: {
      login: "/api/auth/login",
      register: "/api/auth/register",
      logout: "/api/auth/logout",
      forgotPassword: "/api/auth/forgot-password",
      resetPassword: "/api/auth/reset-password",
      refreshToken: "/api/auth/refresh-token",
      profile: "/api/users/profile",
    },
    homestays: {
      list: "/api/homestays",
      search: "/api/homestays/search",
      detail: (id: string) => `/api/homestays/${id}`,
      create: "/api/homestays",
      update: (id: string) => `/api/homestays/${id}`,
      delete: (id: string) => `/api/homestays/${id}`,
      reviews: (id: string) => `/api/homestays/${id}/reviews`,
    },
    adminHomestays: {
      list: "/api/admin/homestays",
      create: "/api/admin/homestays",
      detail: (id: string) => `/api/admin/homestays/${id}`,
      update: (id: string) => `/api/admin/homestays/${id}`,
      delete: (id: string) => `/api/admin/homestays/${id}`,
      updateStatus: (id: string) => `/api/admin/homestays/${id}/status`,
      updateAmenities: (id: string) => `/api/admin/homestays/${id}/amenities`,
      uploadPhotos: (id: string) => `/api/admin/homestays/${id}/photos`,
      reorderPhotos: (id: string) => `/api/admin/homestays/${id}/photos/reorder`,
    },
    amenities: {
      list: "/api/amenities",
      detail: (id: string) => `/api/amenities/${id}`,
    },
    adminAmenities: {
      create: "/api/admin/amenities",
      update: (id: string) => `/api/admin/amenities/${id}`,
      delete: (id: string) => `/api/admin/amenities/${id}`,
    },
    bookings: {
      list: "/api/bookings",
      detail: (id: string) => `/api/bookings/${id}`,
      create: "/api/bookings",
      cancel: (id: string) => `/api/bookings/${id}/cancel`,
      // Extra endpoints present on BE
      calculate: "/api/bookings/calculate",
      modify: (id: string) => `/api/bookings/${id}/modify`,
      cancellationPolicy: (id: string) => `/api/bookings/${id}/cancellation-policy`,
      specialRequests: (id: string) => `/api/bookings/${id}/special-requests`,
    },
    users: {
      list: "/api/users",
      detail: (id: string) => `/api/users/${id}`,
      update: (id: string) => `/api/users/${id}`,
    },
    payments: {
      create: "/api/payments",
      verify: "/api/payments/verify",
      history: "/api/payments/history",
    },
    districts: {
      list: "/api/districts",
    },
  },
};
