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
        this.offline = status === 0;
    }
}

export function errorText(error, fallback = 'Что-то пошло не так. Попробуйте ещё раз') {
    return error instanceof ApiError ? error.message : fallback;
}

// Сообщаем приложению, что сервер недоступен (или снова доступен),
// чтобы показать страницу «ведутся технические работы».
function emit(name) {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(name));
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
        emit('api-down');
        throw new ApiError(0, 'Сервер временно недоступен — ведутся технические работы');
    }

    emit('api-up');

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
