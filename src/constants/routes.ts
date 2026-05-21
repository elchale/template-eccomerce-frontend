export const ROUTES = {
    main: '/',
    home: '/home',

    // Auth
    login: '/login',
    register: '/register',
    verifyEmail: '/verify-email',
    forgotPassword: '/forgot-password',
    changePassword: '/change-password',

    // Main
    profile: '/profile',
    notFound: '*',

    // Legal
    privacy: '/privacy',
    terms: '/terms',

    // Shop
    shop: '/shop',
    shopCategory: '/shop/category/:slug',
    shopProduct: '/shop/product/:slug',
    cart: '/cart',
    checkout: '/checkout',
    checkoutPay: '/checkout/pay/:orderNumber',
    orders: '/orders',
    orderDetail: '/orders/:orderNumber',
    wishlist: '/wishlist',
    search: '/search',

    // Admin
    admin: '/admin',
    adminProducts: '/admin/products',
    adminProductNew: '/admin/products/new',
    adminProductEdit: '/admin/products/:id/edit',
    adminCategories: '/admin/categories',
    adminOrders: '/admin/orders',
    adminOrderDetail: '/admin/orders/:id',
    adminCoupons: '/admin/coupons',
    adminAnalytics: '/admin/analytics',

    // Admin Marketing
    adminMarketingPromos: '/admin/marketing/promos',
    adminMarketingPromoNew: '/admin/marketing/promos/new',
    adminMarketingPromoEdit: '/admin/marketing/promos/:id/edit',
    adminMarketingBanners: '/admin/marketing/banners',
    adminMarketingBannerNew: '/admin/marketing/banners/new',
    adminMarketingBannerEdit: '/admin/marketing/banners/:id/edit',
    adminMarketingPopups: '/admin/marketing/popups',
    adminMarketingPopupNew: '/admin/marketing/popups/new',
    adminMarketingPopupEdit: '/admin/marketing/popups/:id/edit',
    adminMarketingConfig: '/admin/marketing/config',

    // Admin Theme
    adminTheme: '/admin/theme',

    // Admin Email Logs
    adminEmailLogs: '/admin/email-logs',
};

/**
 * URL builders for parametric routes. Consumers should call these instead of
 * hand-templating the path — guarantees the pattern in ROUTES and the runtime
 * URL stay in sync if either changes.
 */
export const buildRoute = {
    shopCategory: (slug: string) => `/shop/category/${slug}`,
    shopProduct: (slug: string) => `/shop/product/${slug}`,
    checkoutPay: (orderNumber: string) => `/checkout/pay/${orderNumber}`,
    orderDetail: (orderNumber: string) => `/orders/${orderNumber}`,
    adminProductEdit: (id: number) => `/admin/products/${id}/edit`,
    adminOrderDetail: (id: number) => `/admin/orders/${id}`,
    adminMarketingPromoEdit: (id: number) => `/admin/marketing/promos/${id}/edit`,
    adminMarketingBannerEdit: (id: number) => `/admin/marketing/banners/${id}/edit`,
    adminMarketingPopupEdit: (id: number) => `/admin/marketing/popups/${id}/edit`,
} as const;

export const API_ROUTES = {
    // Auth
    googleLogin: '/auth/google/',
    login: '/auth/login/',
    logout: '/auth/logout/',
    refresh: '/auth/token/refresh/',
    signup: '/auth/registration/',
    resendEmail: '/resend-email-confirmation/',
    confirmEmail: '/auth/registration/account-confirm-email/',
    changePassword: '/auth/password/change/',
    resetPassword: '/auth/password/reset/',
    resetPasswordConfirm: '/auth/password/reset/confirm/',

    // Other
    profile: '/api/auth/profile/',

    // Products
    products: '/api/products/',
    productDetail: (slug: string) => `/api/products/${slug}/`,
    categories: '/api/categories/',
    categoryDetail: (slug: string) => `/api/categories/${slug}/`,
    productReviews: (slug: string) => `/api/products/${slug}/reviews/`,
    reviews: '/api/reviews/',
    reviewDetail: (id: number) => `/api/reviews/${id}/`,
    wishlist: '/api/wishlist/',
    wishlistToggle: '/api/wishlist/toggle/',

    // Cart & Orders
    cart: '/api/cart/',
    cartItems: '/api/cart/items/',
    cartItemDetail: (id: number) => `/api/cart/items/${id}/`,
    cartItemDelete: (id: number) => `/api/cart/items/${id}/delete/`,
    cartClear: '/api/cart/clear/',
    cartMerge: '/api/cart/merge/',
    checkout: '/api/checkout/',
    orders: '/api/orders/',
    orderDetail: (orderNumber: string) => `/api/orders/${orderNumber}/`,

    // Payments — Mercado Pago (active gateway)
    mercadopagoProcess: '/api/payments/mercadopago/process/',

    // Payments — Culqi (dormant, kept for fallback)
    culqiCharge: '/api/payments/culqi/charge/',
    culqiOrder: '/api/payments/culqi/order/',

    // Payments — Izipay (dormant, kept for fallback)
    izipayCreateToken: '/api/payments/izipay/create-token/',
    izipayVerify: '/api/payments/izipay/verify/',

    // Coupons
    couponValidate: '/api/coupons/validate/',

    // Admin
    adminProducts: '/api/admin/products/',
    adminProductDetail: (id: number) => `/api/admin/products/${id}/`,
    adminProductImages: (id: number) => `/api/admin/products/${id}/images/`,
    adminProductVariants: (id: number) => `/api/admin/products/${id}/variants/`,
    adminCategories: '/api/admin/categories/',
    adminCategoryDetail: (id: number) => `/api/admin/categories/${id}/`,
    adminVariantTypes: '/api/admin/variant-types/',
    adminOrders: '/api/admin/orders/',
    adminOrderDetail: (id: number) => `/api/admin/orders/${id}/`,
    adminOrderStatus: (id: number) => `/api/admin/orders/${id}/status/`,
    adminOrderRefund: (id: number) => `/api/admin/orders/${id}/refund/`,
    adminCoupons: '/api/admin/coupons/',
    adminCouponDetail: (id: number) => `/api/admin/coupons/${id}/`,
    adminDashboard: '/api/admin/dashboard/',

    // Marketing
    marketingPromocionesActivas: '/api/marketing/promociones/activas/',
    marketingBannersActivos: '/api/marketing/banners/activos/',
    marketingPopupsActivos: '/api/marketing/popups/activos/',
    marketingConfiguracion: '/api/marketing/configuracion/',
    searchSuggestions: '/api/products/search-suggestions/',
    adminMarketingPromociones: '/api/admin/marketing/promociones/',
    adminMarketingPromocionDetail: (id: number) => `/api/admin/marketing/promociones/${id}/`,
    adminMarketingBanners: '/api/admin/marketing/banners/',
    adminMarketingBannerDetail: (id: number) => `/api/admin/marketing/banners/${id}/`,
    adminMarketingBannerUploadImage: (id: number) =>
        `/api/admin/marketing/banners/${id}/upload-image/`,
    adminMarketingPopups: '/api/admin/marketing/popups/',
    adminMarketingPopupDetail: (id: number) => `/api/admin/marketing/popups/${id}/`,
    adminMarketingPopupUploadImage: (id: number) =>
        `/api/admin/marketing/popups/${id}/upload-image/`,
    adminMarketingConfig: '/api/admin/marketing/configuracion/',

    // Theme
    marketingTheme: '/api/marketing/theme/',
    adminMarketingTheme: '/api/admin/marketing/theme/',
    adminMarketingThemeReset: '/api/admin/marketing/theme/reset/',

    // Email Logs
    adminEmailLogs: '/api/admin/email-logs/',
    adminEmailLogRetry: (id: number) => `/api/admin/email-logs/${id}/retry/`,
};

// Only these paths dont require to send a token
// See /lib/axios.ts
//
// Public marketing endpoints (banners/popups/promociones/configuracion/
// search-suggestions) are listed here so anonymous storefront browsing
// doesn't trigger Bearer-attach attempts — the axios interceptor short-
// circuits before the refresh-token round-trip on these routes.
export const NO_AUTH_REQUIRED_API_ROUTES = [
    API_ROUTES.login,
    API_ROUTES.googleLogin,
    API_ROUTES.refresh,
    API_ROUTES.signup,
    API_ROUTES.resendEmail,
    API_ROUTES.confirmEmail,
    API_ROUTES.resetPassword,
    API_ROUTES.resetPasswordConfirm,
    API_ROUTES.products,
    API_ROUTES.categories,
    API_ROUTES.marketingTheme,
    API_ROUTES.marketingPromocionesActivas,
    API_ROUTES.marketingBannersActivos,
    API_ROUTES.marketingPopupsActivos,
    API_ROUTES.marketingConfiguracion,
    API_ROUTES.searchSuggestions,
];
