import { request } from './client';

export async function login({ email, password }) {
    const data = await request('/api/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password },
    });
    return data;                 // setToken делает страница после успеха
}

// Сервер сам выдаёт роль покупателя и сразу возвращает токен,
// поэтому после регистрации входить отдельно не нужно.
export function register({ email, password, fullName }) {
    return request('/api/auth/register', {
        method: 'POST',
        body: { email: email.trim(), fullName: fullName.trim(), password },
    });
}

export function me() {
    return request('/api/auth/me', { auth: true });
}

export function updateProfile(values) {
    return request('/api/auth/me', {
        method: 'PATCH',
        body: values,
        auth: true,
    });
}