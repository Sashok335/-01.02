import { request } from './client';

export function getCart() {
    return request('/api/cart', { auth: true });
}

export function addCartItem(productId, quantity = 1) {
    return request('/api/cart', { method: 'POST', auth: true, body: { productId, quantity } });
}

export function setCartItem(productId, quantity) {
    return request(`/api/cart/${productId}`, { method: 'PATCH', auth: true, body: { quantity } });
}

export function removeCartItem(productId) {
    return request(`/api/cart/${productId}`, { method: 'DELETE', auth: true });
}

export function clearCart() {
    return request('/api/cart', { method: 'DELETE', auth: true });
}
