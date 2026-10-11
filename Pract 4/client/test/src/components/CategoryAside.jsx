function CategoryAside({ categories, selected, onChange, onlyDiscount, onOnlyDiscountChange, loading, error }) {
    function toggle(id) {
        if (selected.includes(id)) {
            onChange(selected.filter((x) => x !== id));
        } else {
            onChange([...selected, id]);
        }
    }

    function selectAll() {
        onChange(categories.map((c) => c.categoryId));
    }

    function resetAll() {
        onChange([]);
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-head">
                <h2>Категории</h2>
                {!loading && categories.length > 0 && (
                    <div className="sidebar-buttons">
                        <button type="button" onClick={selectAll}>Все</button>
                        <button type="button" onClick={resetAll}>Сбросить</button>
                    </div>
                )}
            </div>

            {loading && <p className="muted">Загрузка категорий…</p>}
            {error && <p className="error">{error}</p>}
            {!loading && !error && categories.length === 0 && <p className="muted">Категорий пока нет</p>}

            <ul className="sidebar-list">
                {categories.map((c) => (
                    <li key={c.categoryId}>
                        <label>
                            <input
                                type="checkbox"
                                checked={selected.includes(c.categoryId)}
                                onChange={() => toggle(c.categoryId)}
                            />
                            <span>{c.title}</span>
                        </label>
                    </li>
                ))}
            </ul>

            <label className="sidebar-discount">
                <input
                    type="checkbox"
                    checked={onlyDiscount}
                    onChange={(e) => onOnlyDiscountChange(e.target.checked)}
                />
                Только со скидкой
            </label>
        </aside>
    );
}

export default CategoryAside;
