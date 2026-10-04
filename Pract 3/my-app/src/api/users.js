import { request } from './client';

// Нужен только админу, чтобы выбрать, кому выдать купон.
export function getUsers() {
    return request('/api/users', { auth: true });
}
