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
        this.details = details;   // { price: '...' } — покажем под полем формы
    }
}

export async function request(path, { method = 'GET', body, auth = false } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    // 204 = успех без содержимого (так отвечает DELETE)
    if (response.status === 204) return null;

    let data = null;
    try {
        data = await response.json();
    } catch {
        // Сервер ответил не-JSON. Это тоже надо обработать, а не ронять приложение.
    }

    // ВАЖНО: fetch НЕ бросает исключение на 404 и 500.
    // Проверять код ответа нужно вручную, иначе приложение
    // будет считать ошибку успешным результатом.
    if (!response.ok) {
        throw new ApiError(
            response.status,
            data?.error ?? `Ошибка ${response.status}`,
            data?.details,
        );
    }

    return data;
}
