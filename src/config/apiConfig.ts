export const apiConfig = {
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://163.227.230.54:8088/api",
  timeout: 10000,

  endpoints: {
    auth: {
      login: "/auth/login",
      register: "/auth/register",
      logout: "/auth/logout",
      forgotPassword: "/auth/forgot-password",
      resetPassword: "/auth/reset-password",
      refreshToken: "/auth/refresh-token",
      profile: "/auth/profile",
    },
    homestays: {
      list: "/homestays",
      search: "/homestays/search",
      detail: (id: string) => `/homestays/${id}`,
      create: "/homestays",
      update: (id: string) => `/homestays/${id}`,
      delete: (id: string) => `/homestays/${id}`,
      reviews: (id: string) => `/homestays/${id}/reviews`,
    },
    adminHomestays: {
      list: "/admin/homestays",
      create: "/admin/homestays",
      detail: (id: string) => `/admin/homestays/${id}`,
      update: (id: string) => `/admin/homestays/${id}`,
      delete: (id: string) => `/admin/homestays/${id}`,
      updateStatus: (id: string) => `/admin/homestays/${id}/status`,
      updateAmenities: (id: string) => `/admin/homestays/${id}/amenities`,
      uploadPhotos: (id: string) => `/admin/homestays/${id}/photos`,
      reorderPhotos: (id: string) => `/admin/homestays/${id}/photos/reorder`,
    },
    amenities: {
      list: "/amenities",
      detail: (id: string) => `/amenities/${id}`,
    },
    adminAmenities: {
      create: "/admin/amenities",
      update: (id: string) => `/admin/amenities/${id}`,
      delete: (id: string) => `/admin/amenities/${id}`,
    },
    bookings: {
      list: "/bookings",
      detail: (id: string) => `/bookings/${id}`,
      create: "/bookings",
      cancel: (id: string) => `/bookings/${id}/cancel`,
      confirm: (id: string) => `/bookings/${id}/confirm`,
    },
    users: {
      list: "/users",
      detail: (id: string) => `/users/${id}`,
      update: (id: string) => `/users/${id}`,
    },
    payments: {
      create: "/payments",
      verify: "/payments/verify",
      history: "/payments/history",
    },
  },
};
