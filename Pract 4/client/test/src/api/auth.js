import { request } from './client';

export async function login({ email, password }) {
    const data = await request('/api/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password },
    });
    return data;
}

export function register({ email, password, fullName, phone }) {
    return request('/api/auth/register', {
        method: 'POST',
        body: { email: email.trim(), fullName: fullName.trim(), phone, password },
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

export function forgotPassword(email) {
    return request('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim() },
    });
}

export function resetPassword({ email, code, newPassword }) {
    return request('/api/auth/reset-password', {
        method: 'POST',
        body: { email: email.trim(), code: code.trim(), newPassword },
    });
}
