import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import CategoryAside from "../components/CategoryAside";
import { getCategories } from "../api/products";
import { useCatalog } from "../hooks/useCatalog";

function Home() {
    const [categories, setCategories] = useState([]);
    const [catLoading, setCatLoading] = useState(true);
    const [catError, setCatError] = useState(null);

    const [selectedIds, setSelectedIds] = useState([]);
    const [onlyDiscount, setOnlyDiscount] = useState(false);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("title");

    // Список категорий приходит с сервера, а не из константы:
    // админ добавил категорию — и она сама появилась в чекбоксах.
    useEffect(() => {
        let alive = true;

        getCategories()
            .then((data) => { if (alive) setCategories(data); })
            .catch((e) => { if (alive) setCatError(e.message); })
            .finally(() => { if (alive) setCatLoading(false); });

        return () => { alive = false; };
    }, []);

    const { products, loading, error, reload } = useCatalog({
        categoryIds: selectedIds,
        onlyDiscount,
        search,
        sort,
    });

    function resetFilters() {
        setSelectedIds([]);
        setOnlyDiscount(false);
        setSearch("");
    }

    return (
        <div className="layout">
            <CategoryAside
                categories={categories}
                selected={selectedIds}
                onChange={setSelectedIds}
                onlyDiscount={onlyDiscount}
                onOnlyDiscountChange={setOnlyDiscount}
                loading={catLoading}
                error={catError}
            />

            <main>
                <div className="toolbar">
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Поиск по каталогу"
                    />
                    <select value={sort} onChange={(e) => setSort(e.target.value)}>
                        <option value="title">По названию</option>
                        <option value="price">Сначала дешёвые</option>
                        <option value="new">Сначала новые</option>
                    </select>
                </div>

                {loading && <p className="muted">Загрузка каталога…</p>}

                {error && (
                    <div className="error">
                        <p>{error}</p>
                        <button className="beautiful-button" onClick={reload}>Попробовать снова</button>
                    </div>
                )}

                {!loading && !error && products.length === 0 && (
                    <div className="empty">
                        <p>Товаров не найдено</p>
                        <button className="beautiful-button" onClick={resetFilters}>
                            Сбросить фильтры
                        </button>
                    </div>
                )}

                {!loading && !error && products.length > 0 && (
                    <>
                        <p className="muted">Найдено: {products.length}</p>
                        <div className="cardss">
                            {products.map((product) => (
                                <ProductCard key={product.productId} product={product} />
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default Home;
