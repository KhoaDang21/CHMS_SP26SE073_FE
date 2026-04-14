export const apiConfig = {
  baseURL: import.meta.env.VITE_API_URL || "https://api.chms.io.vn",
  timeout: 60000,

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
      /** BE: reviews nằm ở PublicHomestayController */
      reviews: (id: string) => `/api/public/homestays/${id}/reviews`,
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
      reorderPhotos: (id: string) =>
        `/api/admin/homestays/${id}/photos/reorder`,
    },
    amenities: {
      list: "/api/amenities",
    },
    adminAmenities: {
      create: "/api/admin/amenities",
      update: (id: string) => `/api/admin/amenities/${id}`,
      delete: (id: string) => `/api/admin/amenities/${id}`,
    },
    adminPermissions: {
      list: "/api/admin/permissions",
    },
    bookings: {
      list: "/api/bookings",
      detail: (id: string) => `/api/bookings/${id}`,
      create: "/api/bookings",
      cancel: (id: string) => `/api/bookings/${id}/cancel`,
      calculate: "/api/bookings/calculate",
      modify: (id: string) => `/api/bookings/${id}/modify`,
      cancellationPolicy: (id: string) =>
        `/api/bookings/${id}/cancellation-policy`,
      specialRequests: (id: string) => `/api/bookings/${id}/special-requests`,
      confirmCashPayment: (id: string) =>
        `/api/bookings/${id}/confirm-cash-payment`,
      checkIn: (id: string) => `/api/bookings/${id}/check-in`,
      checkOut: (id: string) => `/api/bookings/${id}/check-out`,
      addExperiences: (id: string) => `/api/bookings/${id}/experiences`,
      cancelMyExperience: (experienceBookingId: string) =>
        `/api/bookings/my-experiences/${experienceBookingId}/cancel`,
      updateExperienceBookingStatus: (experienceBookingId: string) =>
        `/api/bookings/experiences/${experienceBookingId}/status`,
      occupiedDates: (homestayId: string) =>
        `/api/bookings/homestays/${homestayId}/occupied-dates`,
    },
    experienceBooking: {
      availableSchedules: (bookingId: string) =>
        `/api/experiencebooking/available-schedules/${bookingId}`,
    },
    extraCharges: {
      create: "/api/extra-charges",
      byBooking: (bookingId: string) =>
        `/api/extra-charges/booking/${bookingId}`,
      delete: (id: string) => `/api/extra-charges/${id}`,
      updatePayment: (id: string) => `/api/extra-charges/${id}/payment`,
    },
    users: {
      list: "/api/users",
      detail: (id: string) => `/api/users/${id}`,
      update: (id: string) => `/api/users/${id}`,
    },
    employees: {
      list: "/api/employees",
      create: "/api/employees",
      detail: (id: string) => `/api/employees/${id}`,
      update: (id: string) => `/api/employees/${id}`,
      delete: (id: string) => `/api/employees/${id}`,
      updateStatus: (id: string) => `/api/employees/${id}/status`,
      uploadAvatar: (id: string) => `/api/employees/${id}/avatar`,
      changeRole: (id: string) => `/api/employees/${id}/role`,
      assignProvince: (id: string) => `/api/employees/${id}/assign-province`,
      assignHomestay: (id: string) => `/api/employees/${id}/assign-homestay`,
      assignHomestays: (id: string) => `/api/employees/${id}/assign-homestays`,
    },
    payments: {
      createLink: "/api/payment/create-link",
      webhook: "/api/payment/webhook",
      detail: (id: string) => `/api/payment/${id}`,
      history: "/api/payment/history",
    },
    promotions: {
      adminList: "/api/admin/promotions",
      adminDetail: (id: string) => `/api/admin/promotions/${id}`,
      adminCreate: "/api/admin/promotions",
      adminUpdate: (id: string) => `/api/admin/promotions/${id}`,
      adminDelete: (id: string) => `/api/admin/promotions/${id}`,
      adminToggleStatus: (id: string) => `/api/admin/promotions/${id}/status`,
      validateCoupon: "/api/coupons/validate",
      activeForCustomer: "/api/promotions/active",
    },
    adminRoles: {
      list: "/api/admin/roles",
      create: "/api/admin/roles",
      update: (id: string) => `/api/admin/roles/${id}`,
      delete: (id: string) => `/api/admin/roles/${id}`,
      updatePermissions: (id: string) => `/api/admin/roles/${id}/permissions`,
    },
    adminBookings: {
      list: "/api/admin/bookings",
      detail: (id: string) => `/api/admin/bookings/${id}`,
      update: (id: string) => `/api/admin/bookings/${id}`,
    },
    staffBookings: {
      list: "/api/staff/bookings",
      create: "/api/staff/bookings",
      today: "/api/staff/bookings/today",
      detail: (id: string) => `/api/staff/bookings/${id}`,
      confirm: (id: string) => `/api/staff/bookings/${id}/confirm`,
      cancel: (id: string) => `/api/staff/bookings/${id}/cancel`,
      checkIn: (id: string) => `/api/staff/bookings/${id}/check-in`,
      checkOut: (id: string) => `/api/staff/bookings/${id}/check-out`,
      extend: (id: string) => `/api/staff/bookings/${id}/extend`,
      // Legacy alias: BE uses check-in endpoint for cash-payment confirmation flow.
      confirmPayment: (id: string) => `/api/staff/bookings/${id}/check-in`,
    },
    adminCustomers: {
      list: "/api/admin/customers",
      detail: (id: string) => `/api/admin/customers/${id}`,
      update: (id: string) => `/api/admin/customers/${id}`,
      bookings: (id: string) => `/api/admin/customers/${id}/bookings`,
      updateStatus: (id: string) => `/api/admin/customers/${id}/status`,
    },
    adminTickets: {
      list: "/api/admin/tickets",
      statistics: "/api/admin/tickets/statistics",
    },
    staffTickets: {
      list: "/api/staff/tickets",
      detail: (id: string) => `/api/staff/tickets/${id}`,
      assign: (id: string) => `/api/staff/tickets/${id}/assign`,
      reply: (id: string) => `/api/staff/tickets/${id}/reply`,
      updateStatus: (id: string) => `/api/staff/tickets/${id}/status`,
    },
    adminDashboard: {
      overview: "/api/admin/dashboard/overview",
      today: "/api/admin/dashboard/today",
      revenue: "/api/admin/dashboard/reports/revenue",
      revenueByHomestay: "/api/admin/dashboard/reports/revenue/by-homestay",
      revenueByPeriod: "/api/admin/dashboard/reports/revenue/by-period",
      bookings: "/api/admin/dashboard/reports/bookings",
      occupancy: "/api/admin/dashboard/reports/occupancy",
      customers: "/api/admin/dashboard/reports/customers",
      exportReports: "/api/admin/dashboard/reports/export",
      hostDashboard: "/api/admin/dashboard/host-dashboard",
    },
    reviews: {
      create: "/api/reviews",
      myReviews: "/api/reviews/my-reviews",
      update: (id: string) => `/api/reviews/${id}`,
      delete: (id: string) => `/api/reviews/${id}`,
      managerList: "/api/manager/reviews",
      managerRespond: (id: string) => `/api/manager/reviews/${id}/response`,
      managerUpdateRespond: (id: string) =>
        `/api/manager/reviews/${id}/response`,
      staffList: "/api/staff/reviews",
      staffApprove: (id: string) => `/api/staff/reviews/${id}/approve`,
      staffReject: (id: string) => `/api/staff/reviews/${id}/reject`,
    },
    districts: {
      list: "/api/districts",
    },
    provinces: {
      /** @deprecated Dùng locations.provinces — BE không có /api/provinces */
      list: "/api/locations/provinces",
    },
    locations: {
      provinces: "/api/locations/provinces",
      districts: (provinceId: string) =>
        `/api/locations/districts/${provinceId}`,
      wards: (districtId: string) => `/api/locations/wards/${districtId}`,
      coastalAreas: "/api/locations/coastal-areas",
    },
    notifications: {
      list: "/api/notifications",
      unreadCount: "/api/notifications/unread-count",
      markRead: (id: string) => `/api/notifications/${id}/read`,
      markAllRead: "/api/notifications/read-all",
      delete: (id: string) => `/api/notifications/${id}`,
      settings: "/api/notifications/settings",
    },
    wishlist: {
      list: "/api/wishlist",
      add: (homestayId: string) => `/api/wishlist/${homestayId}`,
      remove: (homestayId: string) => `/api/wishlist/${homestayId}`,
      recentlyViewed: "/api/recently-viewed",
    },
    publicHomestays: {
      reviews: (homestayId: string) =>
        `/api/public/homestays/${homestayId}/reviews`,
    },
    supportTickets: {
      create: "/api/support/tickets",
      list: "/api/support/tickets",
      detail: (id: string) => `/api/support/tickets/${id}`,
      sendMessage: (id: string) => `/api/support/tickets/${id}/messages`,
      close: (id: string) => `/api/support/tickets/${id}/close`,
    },
    userProfile: {
      get: "/api/users/profile",
      update: "/api/users/profile",
      changePassword: "/api/users/profile/password",
      avatar: "/api/users/profile/avatar",
    },
    ai: {
      chat: "/api/ai/chat",
      chatHistory: "/api/ai/chat/history",
      deleteChatHistory: "/api/ai/chat/history",
      recommendations: "/api/ai/recommendations",
      faq: "/api/ai/faq",
      askFaq: "/api/ai/faq/ask",
      // Admin AI Management
      adminAnalytics: "/api/admin/ai/analytics",
      adminSettings: (key: string) => `/api/admin/ai/settings/${key}`,
      adminKnowledgeBase: "/api/admin/ai/knowledge-base",
      adminKnowledgeBaseDetail: (id: string) =>
        `/api/admin/ai/knowledge-base/${id}`,
    },
    coupons: {
      validate: "/api/coupons/validate",
    },
    experiences: {
      list: "/api/experiences",
      detail: (id: string) => `/api/experiences/${id}`,
      create: "/api/experiences",
      update: (id: string) => `/api/experiences/${id}`,
      delete: (id: string) => `/api/experiences/${id}`,
      updateStatus: (id: string) => `/api/experiences/${id}/status`,
      categories: "/api/experiences/categories",
    },
    serviceCategory: {
      list: "/api/servicecategory",
      detail: (id: string) => `/api/servicecategory/${id}`,
      create: "/api/servicecategory",
      update: (id: string) => `/api/servicecategory/${id}`,
      delete: (id: string) => `/api/servicecategory/${id}`,
    },
    invoices: {
      detail: (bookingId: string) => `/api/invoice/booking/${bookingId}`,
      download: (bookingId: string) =>
        `/api/invoice/booking/${bookingId}/download`,
      sendEmail: (bookingId: string) =>
        `/api/invoice/booking/${bookingId}/send-email`,
      staffAddCharge: (bookingId: string) =>
        `/api/invoice/staff/invoices/${bookingId}/add-charge`,
      adminAll: "/api/invoice/admin/all",
      adminExport: "/api/invoice/admin/export",
    },
    managerBookings: {
      list: "/api/manager/bookings",
      calendar: "/api/manager/bookings/calendar",
      statistics: "/api/manager/bookings/statistics",
      arrivals: "/api/manager/arrivals",
      departures: "/api/manager/departures",
      inHouse: "/api/manager/in-house",
    },
    managerHomestays: {
      list: "/api/manager/homestays",
      detail: (id: string) => `/api/manager/homestays/${id}`,
      update: (id: string) => `/api/manager/homestays/${id}`,
    },
    managerDashboard: {
      dashboard: "/api/manager/dashboard",
      revenueReport: "/api/manager/reports/revenue",
      occupancyReport: "/api/manager/reports/occupancy",
      reviewsReport: "/api/manager/reports/reviews",
      exportReports: "/api/manager/reports/export",
    },
    managerCulturalGuides: {
      pending: "/api/manager/cultural-guides/pending",
      updateStatus: (id: string) => `/api/manager/cultural-guides/${id}/status`,
    },
    staffCustomers: {
      search: "/api/staff/customers/search",
      detail: (id: string) => `/api/staff/customers/${id}`,
    },
    staffHomestays: {
      list: "/api/staff/homestays",
    },
    experienceSchedules: {
      bulkCreate: "/api/localexperienceschedule/bulk-create",
      participants: (scheduleId: string) =>
        `/api/localexperienceschedule/${scheduleId}/participants`,
    },
    culturalGuides: {
      publicList: "/api/public/cultural-guides",
      publicDetail: (id: string) => `/api/public/cultural-guides/${id}`,
      publicByHomestay: (homestayId: string) =>
        `/api/public/homestays/${homestayId}/cultural-guides`,
      customerCreate: "/api/customer/cultural-guides",
      customerMyGuides: "/api/customer/cultural-guides/my-guides",
      adminCreate: "/api/admin/cultural-guides",
      adminDelete: (id: string) => `/api/admin/cultural-guides/${id}`,
    },
    adminCoupons: {
      list: "/api/admin/coupons",
      create: "/api/admin/coupons",
      update: (id: string) => `/api/admin/coupons/${id}`,
      delete: (id: string) => `/api/admin/coupons/${id}`,
      usage: (id: string) => `/api/admin/coupons/${id}/usage`,
    },
    faqs: {
      active: "/api/faqs/active",
      list: "/api/faqs",
      create: "/api/faqs",
      update: (id: string) => `/api/faqs/${id}`,
      delete: (id: string) => `/api/faqs/${id}`,
      toggleStatus: (id: string) => `/api/faqs/${id}/status`,
    },
    homestayPricing: {
      get: (homestayId: string) => `/api/admin/homestays/${homestayId}/pricing`,
      update: (homestayId: string) =>
        `/api/admin/homestays/${homestayId}/pricing`,
      bulkUpdate: "/api/admin/pricing/bulk-update",
      getSeasonalPricing: (homestayId: string) =>
        `/api/admin/homestays/${homestayId}/seasonal-pricing`,
      createSeasonalPricing: (homestayId: string) =>
        `/api/admin/homestays/${homestayId}/seasonal-pricing`,
      updateSeasonalPricing: (homestayId: string, priceId: string) =>
        `/api/admin/homestays/${homestayId}/seasonal-pricing/${priceId}`,
      deleteSeasonalPricing: (homestayId: string, priceId: string) =>
        `/api/admin/homestays/${homestayId}/seasonal-pricing/${priceId}`,
    },
  },
};
