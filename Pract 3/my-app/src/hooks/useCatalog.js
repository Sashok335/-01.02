import { useEffect, useState } from "react";
import { getProducts } from "../api/products";

// Три состояния, а не два: loading, error и данные.
// Забыть про loading — значит повесить крутилку навсегда.
export function useCatalog({ categoryIds, onlyDiscount, search, sort }) {
    // Всё в одном объекте: setState с объектом React применяет целиком,
    // и React не ругается на обновление состояния прямо в эффекте.
    const [state, setState] = useState({
        products: [],
        loading: true,
        error: null,
    });

    // Зависимости — примитивы, а не объект filters.
    // Объект был бы новым при каждом рендере, и запросы шли бы бесконечно.
    useEffect(() => {
        let alive = true;

        getProducts({ categoryIds, onlyDiscount, search, sort })
            .then((data) => {
                if (!alive) return;
                // Успешный запрос сбрасывает прошлую ошибку.
                setState({ products: data, loading: false, error: null });
            })
            .catch((e) => {
                if (!alive) return;
                // Данные чистим, чтобы не показывать мусор из прошлой удачной загрузки.
                setState({ products: [], loading: false, error: e.message ?? "Не удалось загрузить товары" });
            });

        // Флаг снимается, когда компонент уходит со страницы:
        // ответ может прийти позже и уже некуда его положить.
        return () => { alive = false; };
    }, [categoryIds, onlyDiscount, search, sort]);

    // Тот же запрос по кнопке «Попробовать снова».
    // useEffect его не повторит: зависимости не изменились.
    function reload() {
        setState((s) => ({ ...s, loading: true, error: null }));

        getProducts({ categoryIds, onlyDiscount, search, sort })
            .then((data) => setState({ products: data, loading: false, error: null }))
            .catch((e) => setState({ products: [], loading: false, error: e.message ?? "Не удалось загрузить товары" }));
    }

    return { ...state, reload };
}
