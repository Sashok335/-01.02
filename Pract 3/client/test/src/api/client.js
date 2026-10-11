const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const TOKEN_KEY = 'shop_token';

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

export function errorText(error, fallback = 'Что-то пошло не так. Попробуйте ещё раз') {
    return error instanceof ApiError ? error.message : fallback;
}

export async function request(path, { method = 'GET', body, auth = false } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(`${API_URL}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new ApiError(0, 'Внутренняя ошибка сервера');
    }

    if (response.status === 204) return null;

    let data = null;
    try {
        data = await response.json();
    } catch {
    }

    if (!response.ok) {
        throw new ApiError(
            response.status,
            data?.error ?? `Сервер вернул ошибку ${response.status}`,
            data?.details,
        );
    }

    return data;
}