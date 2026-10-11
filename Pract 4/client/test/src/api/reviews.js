import { request } from './client';

export function getProductReviews(productId) {
    return request(`/api/products/${productId}/reviews`);
}

export function createReview(productId, { rating, comment }) {
    return request(`/api/products/${productId}/reviews`, {
        method: 'POST',
        auth: true,
        body: { rating, comment },
    });
}

export function getAllReviews() {
    return request('/api/reviews', { auth: true });
}

export function deleteReview(id) {
    return request(`/api/reviews/${id}`, { method: 'DELETE', auth: true });
}
