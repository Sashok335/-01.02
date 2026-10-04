import { request } from './client';

export function getMyAddresses() {
    return request('/api/addresses', { auth: true });
}

export function createMyAddress({ label, address }) {
    return request('/api/addresses', {
        method: 'POST',
        auth: true,
        body: { label, address },
    });
}

export function deleteMyAddress(id) {
    return request(`/api/addresses/${id}`, {
        method: 'DELETE',
        auth: true,
    });
}
