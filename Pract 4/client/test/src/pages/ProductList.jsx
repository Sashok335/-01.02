import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import CategoryAside from "../components/CategoryAside";
import { getCategories, getProducts } from "../api/products";
import { errorText } from "../api/client";

function Home() {
    const [categories, setCategories] = useState([]);
    const [catLoading, setCatLoading] = useState(true);
    const [catError, setCatError] = useState(null);

    const [selectedIds, setSelectedIds] = useState([]);
    const [onlyDiscount, setOnlyDiscount] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [sort, setSort] = useState("title");
    const [catalog, setCatalog] = useState({
        products: [],
        loading: true,
        error: null,
    });

    useEffect(() => {
        let alive = true;

        getCategories()
            .then((data) => { if (alive) setCategories(data); })
            .catch((e) => { if (alive) setCatError(errorText(e, "Не удалось загрузить категории")); })
            .finally(() => { if (alive) setCatLoading(false); });

        return () => { alive = false; };
    }, []);

    // Живой поиск с задержкой: запрос уходит, когда пользователь перестал печатать.
    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput), 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        let alive = true;

        getProducts({ categoryIds: selectedIds, onlyDiscount, search, minPrice, maxPrice, sort })
            .then((products) => {
                if (!alive) return;
                setCatalog({ products, loading: false, error: null });
            })
            .catch((e) => {
                if (!alive) return;
                setCatalog({
                    products: [],
                    loading: false,
                    error: errorText(e, "Не удалось загрузить дома"),
                });
            });

        return () => { alive = false; };
    }, [selectedIds, onlyDiscount, search, minPrice, maxPrice, sort]);

    function reload() {
        setCatalog((current) => ({ ...current, loading: true, error: null }));

        getProducts({ categoryIds: selectedIds, onlyDiscount, search, minPrice, maxPrice, sort })
            .then((products) => setCatalog({ products, loading: false, error: null }))
            .catch((e) => setCatalog({
                products: [],
                loading: false,
                error: errorText(e, "Не удалось загрузить дома"),
            }));
    }

    const { products, loading, error } = catalog;

    function resetFilters() {
        setSelectedIds([]);
        setOnlyDiscount(false);
        setSearchInput("");
        setSearch("");
        setMinPrice("");
        setMaxPrice("");
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
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Поиск по каталогу"
                    />
                    <select value={sort} onChange={(e) => setSort(e.target.value)}>
                        <option value="title">По названию</option>
                        <option value="price">Сначала дешёвые</option>
                        <option value="new">Сначала новые</option>
                    </select>
                </div>

                <div className="price-filter">
                    <span className="muted">Цена, ₽:</span>
                    <input
                        type="number"
                        min="0"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="от"
                    />
                    <span className="muted">—</span>
                    <input
                        type="number"
                        min="0"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        placeholder="до"
                    />
                    {(minPrice || maxPrice) && (
                        <button className="link-button" type="button" onClick={() => { setMinPrice(""); setMaxPrice(""); }}>
                            Сбросить цену
                        </button>
                    )}
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
                        <p>Домов не найдено</p>
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
