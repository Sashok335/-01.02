import { request } from './client';

export function getMyPurchases() {
    return request('/api/purchases', { auth: true });
}

// Оформление корзины. Скидку считает сервер — здесь только productId и количество.
export function checkout({ items, couponCode, shippingAddress }) {
    return request('/api/purchases', {
        method: 'POST',
        auth: true,
        body: { items, couponCode, shippingAddress },
    });
}
