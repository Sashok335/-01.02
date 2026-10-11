import { request } from './client';

export function getMyCoupons() {
    return request('/api/coupons/mine', { auth: true });
}

export function getAllCoupons() {
    return request('/api/coupons', { auth: true });
}

export function createCoupon(data) {
    return request('/api/coupons', { method: 'POST', body: data, auth: true });
}

export function updateCoupon(id, data) {
    return request(`/api/coupons/${id}`, { method: 'PATCH', body: data, auth: true });
}

export function deleteCoupon(id) {
    return request(`/api/coupons/${id}`, { method: 'DELETE', auth: true });
}
