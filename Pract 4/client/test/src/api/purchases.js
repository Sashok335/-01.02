import { request } from './client';

export function getMyPurchases() {
    return request('/api/purchases', { auth: true });
}

export function checkout({ items, couponCode, shippingAddress, deliveryDate }) {
    return request('/api/purchases', {
        method: 'POST',
        auth: true,
        body: { items, couponCode, shippingAddress, deliveryDate },
    });
}
