import { request } from './client';

export function getCategories() {
    return request('/api/categories');
}

export function getAllCategories() {
    return request('/api/categories/admin/all', { auth: true });
}

export function createCategory({ title, description }) {
    return request('/api/categories', { method: 'POST', body: { title, description }, auth: true });
}

export function updateCategory(id, data) {
    return request(`/api/categories/${id}`, { method: 'PATCH', body: data, auth: true });
}

export function deleteCategory(id) {
    return request(`/api/categories/${id}`, { method: 'DELETE', auth: true });
}

export function getProductById(id) {
    return request(`/api/products/${id}`);
}

// Фильтры собираем в строку запроса один раз, здесь.
// Компонент не строит URL руками.
export function getProducts({ categoryIds = [], onlyDiscount = false, search = '', sort = 'title' } = {}) {
    const params = new URLSearchParams();
    if (categoryIds.length) params.set('categoryIds', categoryIds.join(','));
    if (onlyDiscount) params.set('discount', 'true');
    if (search.trim()) params.set('search', search.trim());
    if (sort) params.set('sort', sort);

    return request(`/api/products?${params.toString()}`);
}

export function getAllProducts() {
    return request('/api/products/admin/all', { auth: true });
}

export function createProduct(data) {
    return request('/api/products', { method: 'POST', body: data, auth: true });
}

export function updateProduct(id, data) {
    return request(`/api/products/${id}`, { method: 'PATCH', body: data, auth: true });
}

export function deleteProduct(id) {
    return request(`/api/products/${id}`, { method: 'DELETE', auth: true });
}
