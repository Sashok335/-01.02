import { request } from './client';

export function getAllOrders() {
    return request('/api/orders', { auth: true });
}

export function setOrderStatus(id, status) {
    return request(`/api/orders/${id}/status`, {
        method: 'PATCH',
        auth: true,
        body: { status },
    });
}
