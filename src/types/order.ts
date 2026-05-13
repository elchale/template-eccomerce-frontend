/**
 * Cart, checkout, and order domain types.
 *
 * The flow these types model: cart items → checkout request → pending
 * order → payment IPN → paid/shipped/delivered. `OrderStatus` is the
 * narrow union enforced server-side; client UI maps each value through
 * `ORDER_STATUS_STEPS` (see `constants/orders.ts`) for visualization.
 */
export interface CartItem {
    id: number;
    product: number;
    product_name: string;
    product_slug: string;
    product_image: string | null;
    variant: number | null;
    variant_info: string;
    quantity: number;
    unit_price: string;
    line_total: string;
}

export interface Cart {
    id: number;
    items: CartItem[];
    subtotal: string;
    item_count: number;
}

export interface CartItemRequest {
    product_id: number;
    variant_id?: number;
    quantity: number;
}

export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface OrderItem {
    id: number;
    product_name: string;
    variant_info: string;
    price: string;
    quantity: number;
    image_url: string;
    line_total: string;
}

export interface OrderStatusHistory {
    id: number;
    old_status: OrderStatus;
    new_status: OrderStatus;
    note: string;
    changed_by_email: string;
    created: string;
}

export interface OrderListItem {
    id: number;
    order_number: string;
    status: OrderStatus;
    total: string;
    item_count: number;
    created: string;
}

export interface OrderDetail extends OrderListItem {
    subtotal: string;
    discount_amount: string;
    shipping_address: string;
    billing_address: string;
    notes: string;
    coupon_code: string | null;
    email: string;
    phone: string;
    items: OrderItem[];
    status_history: OrderStatusHistory[];
    /** New fields added by Izipay payments feature (ADR §6) */
    uuid?: string;
    payment_status?: PaymentStatus;
    payment_method?: string;
    izipay_transaction_id?: string;
}

export interface CheckoutRequest {
    shipping_address: string;
    billing_address?: string;
    email: string;
    phone?: string;
    notes?: string;
    coupon_code?: string;
}

export interface Coupon {
    id: number;
    code: string;
    description: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: string;
    min_purchase_amount: string;
    max_discount_amount: string | null;
    usage_limit: number | null;
    times_used: number;
    is_active: boolean;
    valid_from: string;
    valid_until: string;
}

export interface CouponValidationResult {
    coupon_id: number;
    code: string;
    description: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: string;
    discount_amount: string;
}
