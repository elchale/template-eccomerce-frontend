// API hooks barrel file
export { useMe, ME_KEYS } from './useMe';
export { useProfile, PROFILE_KEYS } from './useProfile';
export type { UserProfile } from './useProfile';

export { useProducts, useProductDetail, PRODUCT_KEYS } from './useProducts';
export { useCategories, useCategoryDetail, CATEGORY_KEYS } from './useCategories';
export {
    useCart,
    useAddToCart,
    useUpdateCartItem,
    useRemoveCartItem,
    useClearCart,
    CART_KEYS,
} from './useCart';
export { useOrders, useOrderDetail, useCheckout, ORDER_KEYS } from './useOrders';
export { useWishlist, useToggleWishlist, WISHLIST_KEYS } from './useWishlist';
export { useProductReviews, useCreateReview, REVIEW_KEYS } from './useReviews';
export {
    useActivePromociones,
    useActiveBanners,
    useActivePopups,
    useStoreConfig,
    useSearchSuggestions,
    MARKETING_KEYS,
} from './useMarketing';

export {
    useAdminPromociones,
    useAdminPromocionDetail,
    useAdminCreatePromocion,
    useAdminUpdatePromocion,
    useAdminDeletePromocion,
    useAdminBanners,
    useAdminBannerDetail,
    useAdminCreateBanner,
    useAdminUpdateBanner,
    useAdminDeleteBanner,
    useAdminPopups,
    useAdminPopupDetail,
    useAdminCreatePopup,
    useAdminUpdatePopup,
    useAdminDeletePopup,
    useAdminUploadBannerImage,
    useAdminUploadPopupImage,
    useAdminStoreConfig,
    useAdminUpdateStoreConfig,
    ADMIN_MARKETING_KEYS,
} from './useAdminMarketing';

export {
    useAdminDashboard,
    useAdminProducts,
    useAdminCreateProduct,
    useAdminUpdateProduct,
    useAdminDeleteProduct,
    useAdminProductDetail,
    useAdminUploadProductImage,
    useAdminDeleteProductImage,
    useAdminOrders,
    useAdminOrderDetail,
    useAdminUpdateOrderStatus,
    useAdminCoupons,
    useAdminCreateCoupon,
    useAdminUpdateCoupon,
    useAdminCategories,
    useAdminCreateCategory,
    useAdminUpdateCategory,
    useAdminDeleteCategory,
    useAdminDeleteCoupon,
    ADMIN_KEYS,
} from './useAdmin';

export { useThemeSettings, THEME_KEYS } from './useThemeSettings';
export { useIzipayToken, useVerifyPayment, PAYMENT_KEYS } from './usePayments';
export type {
    VerifyPaymentPayload,
    VerifyPaymentResponse,
    IzipayTokenResponse,
} from './usePayments';
export {
    useAdminThemeSettings,
    useAdminUpdateTheme,
    useAdminResetTheme,
    ADMIN_THEME_KEYS,
} from './useAdminTheme';
