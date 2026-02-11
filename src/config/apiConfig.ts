export const apiConfig = {
  baseURL: import.meta.env.VITE_API_URL || 'https://localhost:7206/api',
  timeout: 10000,
  
  endpoints: {
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      logout: '/auth/logout',
      forgotPassword: '/auth/forgot-password',
      resetPassword: '/auth/reset-password',
      refreshToken: '/auth/refresh-token',
      profile: '/auth/profile',
    },
    homestays: {
      list: '/homestays',
      search: '/homestays/search',
      detail: (id: string) => `/homestays/${id}`,
      create: '/homestays',
      update: (id: string) => `/homestays/${id}`,
      delete: (id: string) => `/homestays/${id}`,
      reviews: (id: string) => `/homestays/${id}/reviews`,
    },
    bookings: {
      list: '/bookings',
      detail: (id: string) => `/bookings/${id}`,
      create: '/bookings',
      cancel: (id: string) => `/bookings/${id}/cancel`,
      confirm: (id: string) => `/bookings/${id}/confirm`,
    },
    users: {
      list: '/users',
      detail: (id: string) => `/users/${id}`,
      update: (id: string) => `/users/${id}`,
    },
    payments: {
      create: '/payments',
      verify: '/payments/verify',
      history: '/payments/history',
    },
  },
};