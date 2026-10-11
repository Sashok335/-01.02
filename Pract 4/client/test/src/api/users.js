import { request } from './client';

export function getUsers() {
    return request('/api/users', { auth: true });
}
