import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { getAllCoupons, createCoupon, updateCoupon, deleteCoupon } from "../api/coupons";
import { getUsers } from "../api/users";
import { getAllOrders, setOrderStatus } from "../api/orders";
import { getAllReviews, deleteReview } from "../api/reviews";
import {
    getAllProducts,
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    createProduct,
    updateProduct,
    deleteProduct,
} from "../api/products";
import { errorText } from "../api/client";

const EMPTY_PRODUCT = {
    title: "",
    categoryId: "",
    price: "",
    discountPercent: "",
    stock: "",
    description: "",
    imageUrl: "",
    size: "",
    area: "",
    buildTime: "",
};

const ORDER_STATUSES = [
    { value: "pending",   label: "Ожидает оплаты" },
    { value: "paid",      label: "Оплачен" },
    { value: "shipped",   label: "Отправлен" },
    { value: "cancelled", label: "Отменён" },
    { value: "refunded",  label: "Возврат" },
];

function AccessDenied() {
    return (
        <div className="access-denied">
            <div className="access-denied-card">
                <span className="access-denied-icon" aria-hidden="true">🔒</span>
                <h2>Доступ запрещён</h2>
                <p className="muted">
                    Эта страница доступна только администратору.
                </p>
            </div>
        </div>
    );
}

function Admin() {
    const { user, checking } = useContext(AuthContext);
    const navigate = useNavigate();

    const [tab, setTab] = useState("orders");

    const [users, setUsers] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [orders, setOrders] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loadError, setLoadError] = useState(null);
    const [orderError, setOrderError] = useState(null);
    const [reviewOk, setReviewOk] = useState(null);

    const [target, setTarget] = useState("user");
    const [editingCouponId, setEditingCouponId] = useState(null);
    const [values, setValues] = useState({
        code: "",
        discountPercent: "",
        minOrderAmount: "",
        userId: "",
        productId: "",
    });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [couponOk, setCouponOk] = useState(null);

    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [categoryTitle, setCategoryTitle] = useState("");
    const [categoryDescription, setCategoryDescription] = useState("");
    const [categoryError, setCategoryError] = useState(null);
    const [categoryOk, setCategoryOk] = useState(null);

    const [product, setProduct] = useState(EMPTY_PRODUCT);
    const [editingProductId, setEditingProductId] = useState(null);
    const [productErrors, setProductErrors] = useState({});
    const [productError, setProductError] = useState(null);
    const [productOk, setProductOk] = useState(null);

    const isAdmin = user?.role?.name === "admin";

    useEffect(() => {
        if (checking) return;
        if (!user) {
            navigate("/login");
            return;
        }
        if (!isAdmin) return;

        let alive = true;

        Promise.all([
            getAllCoupons(),
            getAllProducts(),
            getAllCategories(),
            getUsers(),
            getAllOrders(),
            getAllReviews(),
        ])
            .then(([couponRows, productRows, categoryRows, userRows, orderRows, reviewRows]) => {
                if (!alive) return;
                setCoupons(couponRows);
                setProducts(productRows);
                setCategories(categoryRows);
                setUsers(userRows);
                setOrders(orderRows);
                setReviews(reviewRows);
                setLoadError(null);
            })
            .catch((error) => { if (alive) setLoadError(errorText(error, "Не удалось загрузить данные админки")); });

        return () => { alive = false; };
    }, [user, isAdmin, checking, navigate]);

    function handleChange(e) {
        const { name, value } = e.target;
        setValues((v) => ({ ...v, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    function handleProductChange(e) {
        const { name, value } = e.target;
        setProduct((v) => ({ ...v, [name]: value }));
        setProductErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    function resetCouponForm() {
        setEditingCouponId(null);
        setTarget("user");
        setValues({
            code: "",
            discountPercent: "",
            minOrderAmount: "",
            userId: "",
            productId: "",
        });
        setErrors({});
        setFormError(null);
        setCouponOk(null);
    }

    function startCouponEdit(coupon) {
        if (coupon.isUsed) return;
        setEditingCouponId(coupon.couponId);
        setTarget(coupon.userId ? "user" : "product");
        setValues({
            code: coupon.code,
            discountPercent: String(coupon.discountPercent),
            minOrderAmount: coupon.minOrderAmount ?? "",
            userId: coupon.userId ? String(coupon.userId) : "",
            productId: coupon.productId ? String(coupon.productId) : "",
        });
        setErrors({});
        setFormError(null);
        setCouponOk(null);
    }

    async function handleCoupon(e) {
        e.preventDefault();
        setFormError(null);
        setCouponOk(null);

        const found = {};
        if (!values.code.trim()) found.code = "Введите код";
        const dp = Number(values.discountPercent);
        if (!Number.isInteger(dp) || dp < 1 || dp > 99) found.discountPercent = "Скидка — целое от 1 до 99";
        if (target === "user" && !values.userId) found.userId = "Выберите покупателя";
        if (target === "product" && !values.productId) found.productId = "Выберите дом";

        if (Object.keys(found).length) {
            setErrors(found);
            return;
        }

        setSubmitting(true);
        try {
            const body = {
                code: values.code,
                discountPercent: dp,
            };

            if (target === "user") {
                body.userId = Number(values.userId);
            } else {
                body.productId = Number(values.productId);
            }

            if (values.minOrderAmount) body.minOrderAmount = Number(values.minOrderAmount);

            const saved = editingCouponId
                ? await updateCoupon(editingCouponId, body)
                : await createCoupon(body);
            setCoupons(await getAllCoupons());
            const message = editingCouponId
                ? `Купон ${saved.code} обновлён`
                : `Купон ${saved.code} выдан`;
            resetCouponForm();
            setCouponOk(message);
        } catch (err) {
            setFormError(errorText(err, "Не удалось сохранить купон"));
            if (err.details) setErrors(err.details);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm("Отозвать этот купон?")) return;
        try {
            await deleteCoupon(id);
            setCoupons((prev) => prev.filter((c) => c.couponId !== id));
            if (editingCouponId === id) resetCouponForm();
        } catch (err) {
            setFormError(errorText(err, "Не удалось отозвать купон"));
        }
    }

    async function handleOrderStatus(order, status) {
        setOrderError(null);
        if (status === order.status) return;
        try {
            const updated = await setOrderStatus(order.orderId, status);
            setOrders((current) => current.map((o) => (o.orderId === order.orderId
                ? { ...o, status: updated.status ?? status }
                : o)));
        } catch (err) {
            setOrderError(errorText(err, "Не удалось изменить статус заказа"));
        }
    }

    async function handleDeleteReview(review) {
        setReviewOk(null);
        if (!window.confirm("Удалить отзыв за нарушение политики?")) return;
        try {
            await deleteReview(review.reviewId);
            setReviews((current) => current.map((r) => (r.reviewId === review.reviewId
                ? { ...r, isDeleted: true, rating: null, comment: null }
                : r)));
            setReviewOk("Отзыв удалён за нарушение политики");
        } catch (err) {
            setReviewOk(errorText(err, "Не удалось удалить отзыв"));
        }
    }

    async function handleCategory(e) {
        e.preventDefault();
        setCategoryError(null);
        setCategoryOk(null);

        if (!categoryTitle.trim()) {
            setCategoryError("Введите название");
            return;
        }

        try {
            const data = { title: categoryTitle, description: categoryDescription };
            const saved = editingCategoryId
                ? await updateCategory(editingCategoryId, data)
                : await createCategory(data);
            setCategories(await getAllCategories());
            setCategoryOk(editingCategoryId
                ? `Категория «${saved.title}» обновлена`
                : `Категория «${saved.title}» добавлена`);
            setEditingCategoryId(null);
            setCategoryTitle("");
            setCategoryDescription("");
        } catch (err) {
            setCategoryError(errorText(err, "Не удалось сохранить категорию"));
        }
    }

    function startCategoryEdit(category) {
        if (category.title === "Без категории") return;
        setEditingCategoryId(category.categoryId);
        setCategoryTitle(category.title);
        setCategoryDescription(category.description ?? "");
        setCategoryError(null);
        setCategoryOk(null);
    }

    async function handleCategoryStatus(category) {
        if (category.title === "Без категории") return;
        const isActive = !category.isActive;
        if (!isActive && !window.confirm(`Скрыть категорию «${category.title}»? Её дома останутся в этой категории.`)) return;
        try {
            await updateCategory(category.categoryId, { isActive });
            setCategories(await getAllCategories());
        } catch (err) {
            setCategoryError(errorText(err, "Не удалось изменить категорию"));
        }
    }

    async function handleCategoryDelete(category) {
        if (category.title === "Без категории") return;
        if (!window.confirm(`Удалить категорию «${category.title}»? Её дома будут перенесены в «Без категории».`)) return;

        try {
            const result = await deleteCategory(category.categoryId);
            setCategories(await getAllCategories());
            setProducts(await getAllProducts());
            setCategoryOk(result.message);

            if (editingCategoryId === category.categoryId) {
                setEditingCategoryId(null);
                setCategoryTitle("");
                setCategoryDescription("");
            }
            if (editingProductId && product.categoryId === String(category.categoryId)) {
                setEditingProductId(null);
                setProduct(EMPTY_PRODUCT);
            }
        } catch (err) {
            setCategoryError(errorText(err, "Не удалось удалить категорию"));
        }
    }

    async function handleProduct(e) {
        e.preventDefault();
        setProductError(null);
        setProductOk(null);

        const found = {};
        if (!product.title.trim()) found.title = "Введите название";
        if (!product.categoryId) found.categoryId = "Выберите категорию";
        if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0) {
            found.price = "Цена должна быть числом больше нуля";
        }
        const dp = Number(product.discountPercent || 0);
        if (!Number.isInteger(dp) || dp < 0 || dp > 99) {
            found.discountPercent = "Скидка — целое от 0 до 99";
        }
        if (product.area !== "" && (!Number.isFinite(Number(product.area)) || Number(product.area) <= 0)) {
            found.area = "Площадь должна быть положительным числом";
        }

        if (Object.keys(found).length) {
            setProductErrors(found);
            return;
        }

        const body = {
            title: product.title,
            categoryId: Number(product.categoryId),
            price: Number(product.price),
            discountPercent: dp,
            description: product.description,
            stock: product.stock === "" ? null : Number(product.stock),
            imageUrl: product.imageUrl.trim() || null,
            size: product.size.trim() || null,
            area: product.area === "" ? null : Number(product.area),
            buildTime: product.buildTime.trim() || null,
        };

        try {
            const saved = editingProductId
                ? await updateProduct(editingProductId, body)
                : await createProduct(body);
            setProducts(await getAllProducts());
            setProductOk(editingProductId
                ? `Дом «${saved.title}» обновлён`
                : `Дом «${saved.title}» добавлен`);
            setEditingProductId(null);
            setProduct(EMPTY_PRODUCT);
        } catch (err) {
            setProductError(errorText(err, "Не удалось сохранить дом"));
            if (err.details) setProductErrors(err.details);
        }
    }

    function startProductEdit(item) {
        setEditingProductId(item.productId);
        setProduct({
            title: item.title,
            categoryId: String(item.categoryId),
            price: String(item.price),
            discountPercent: String(item.discountPercent),
            stock: item.stock === null ? "" : String(item.stock),
            description: item.description ?? "",
            imageUrl: item.imageUrl ?? "",
            size: item.size ?? "",
            area: item.area === null || item.area === undefined ? "" : String(item.area),
            buildTime: item.buildTime ?? "",
        });
        setProductErrors({});
        setProductError(null);
        setProductOk(null);
    }

    async function handleProductStatus(item) {
        const isActive = !item.isActive;
        if (!isActive && !window.confirm(`Скрыть дом «${item.title}» из каталога?`)) return;
        try {
            await updateProduct(item.productId, { isActive });
            setProducts((current) => current.map((productItem) => productItem.productId === item.productId
                ? { ...productItem, isActive }
                : productItem));
        } catch (err) {
            setProductError(errorText(err, "Не удалось изменить дом"));
        }
    }

    async function handleProductDelete(item) {
        if (!window.confirm(`Удалить дом «${item.title}»? Его отзывы, купоны и позиции в корзинах также будут удалены. Если дом есть в истории заказов, удалить его нельзя.`)) return;
        setProductError(null);
        setProductOk(null);

        try {
            await deleteProduct(item.productId);
            setProducts((current) => current.filter((productItem) => productItem.productId !== item.productId));
            if (editingProductId === item.productId) {
                setEditingProductId(null);
                setProduct(EMPTY_PRODUCT);
            }
            setProductOk(`Дом «${item.title}» удалён`);
        } catch (err) {
            setProductError(errorText(err, "Не удалось удалить дом"));
        }
    }

    if (checking) return <p className="muted center">Проверяем права…</p>;
    if (!user) return null;

    // Не админ — видит экран «Доступ запрещён», без редиректа.
    if (!isAdmin) return <AccessDenied />;

    const tabs = [
        ["orders", "Заказы"],
        ["reviews", "Отзывы"],
        ["products", "Дома"],
        ["categories", "Категории"],
        ["coupons", "Купоны"],
    ];

    return (
        <div className="dashboard admin-page">
            <div className="admin-head">
                <div>
                    <span className="section-eyebrow">Панель управления</span>
                    <h2>Админка</h2>
                </div>
                <p className="muted">Дома, заказы, отзывы, категории и купоны</p>
            </div>

            <div className="tabs admin-tabs">
                {tabs.map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        className={`tab ${tab === key ? "tab-active" : ""}`}
                        onClick={() => setTab(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {loadError && <p className="error">{loadError}</p>}

            {tab === "orders" && (
                <section className="admin-section">
                    <h3 className="admin-section-title">Все заказы</h3>
                    {orderError && <p className="error">{orderError}</p>}
                    {orders.length === 0 ? (
                        <p className="muted">Заказов пока нет</p>
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Заказ</th>
                                        <th>Покупатель</th>
                                        <th>Адрес</th>
                                        <th>Доставка</th>
                                        <th>Позиции</th>
                                        <th>Сумма</th>
                                        <th>Статус</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((o) => (
                                        <tr key={o.orderId}>
                                            <td className="nowrap"><b>{o.orderNumber}</b></td>
                                            <td>{o.userName}</td>
                                            <td className="muted cell-address">{o.shippingAddress}</td>
                                            <td className="nowrap">{o.deliveryDateFormatted}</td>
                                            <td className="nowrap">{o.itemsCount} поз. / {o.unitsCount} ед.</td>
                                            <td className="nowrap">{Number(o.totalPrice).toLocaleString("ru-RU")} ₽</td>
                                            <td>
                                                <select
                                                    className="status-select"
                                                    value={o.status}
                                                    onChange={(e) => handleOrderStatus(o, e.target.value)}
                                                >
                                                    {ORDER_STATUSES.map((s) => (
                                                        <option key={s.value} value={s.value}>{s.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {tab === "reviews" && (
                <section className="admin-section">
                    <h3 className="admin-section-title">Отзывы</h3>
                    {reviewOk && <p className="ok-text">{reviewOk}</p>}
                    {reviews.length === 0 ? (
                        <p className="muted">Отзывов пока нет</p>
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Дом</th>
                                        <th>Покупатель</th>
                                        <th>Оценка</th>
                                        <th>Отзыв</th>
                                        <th>Дата</th>
                                        <th>Статус</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reviews.map((r) => (
                                        <tr key={r.reviewId}>
                                            <td>{r.productTitle}</td>
                                            <td className="nowrap">{r.userName}</td>
                                            <td className="nowrap">{r.isDeleted ? "—" : `${r.rating}/5`}</td>
                                            <td className="cell-comment">
                                                {r.isDeleted ? <span className="muted">скрыт за нарушение политики</span> : r.comment}
                                            </td>
                                            <td className="nowrap muted">{r.createdAtFormatted}</td>
                                            <td className="nowrap">
                                                <span className={`status-chip ${r.isDeleted ? "bad" : "ok"}`}>
                                                    {r.isDeleted ? "Удалён" : "Активен"}
                                                </span>
                                            </td>
                                            <td className="nowrap">
                                                {!r.isDeleted && (
                                                    <button
                                                        className="link-button danger-link"
                                                        onClick={() => handleDeleteReview(r)}
                                                    >
                                                        Удалить
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {tab === "products" && (
                <div className="admin-grid">
                    <form className="shop-form" onSubmit={handleProduct}>
                        <h3>{editingProductId ? "Изменить дом" : "Добавить дом"}</h3>

                        <label>
                            Название
                            <input name="title" value={product.title} onChange={handleProductChange}
                                placeholder="Каркасный дом «Мечта»"
                                className={productErrors.title ? "invalid" : ""} />
                            {productErrors.title && <span className="error">{productErrors.title}</span>}
                        </label>

                        <label>
                            Категория
                            <select name="categoryId" value={product.categoryId} onChange={handleProductChange}
                                className={productErrors.categoryId ? "invalid" : ""}>
                                <option value="">— выберите —</option>
                                {categories.filter((c) => c.isActive || String(c.categoryId) === product.categoryId).map((c) => (
                                    <option key={c.categoryId} value={c.categoryId}>{c.title}</option>
                                ))}
                            </select>
                            {productErrors.categoryId && <span className="error">{productErrors.categoryId}</span>}
                        </label>

                        <div className="form-row">
                            <label>
                                Цена, ₽
                                <input name="price" value={product.price} onChange={handleProductChange}
                                    placeholder="3635000"
                                    className={productErrors.price ? "invalid" : ""} />
                                {productErrors.price && <span className="error">{productErrors.price}</span>}
                            </label>

                            <label>
                                Скидка, %
                                <input name="discountPercent" type="number" min="0" max="99" step="1"
                                    value={product.discountPercent}
                                    onChange={handleProductChange} placeholder="0"
                                    className={productErrors.discountPercent ? "invalid" : ""} />
                                {productErrors.discountPercent && (
                                    <span className="error">{productErrors.discountPercent}</span>
                                )}
                            </label>

                            <label>
                                Остаток
                                <input name="stock" value={product.stock} onChange={handleProductChange}
                                    placeholder="пусто = под заказ"
                                    className={productErrors.stock ? "invalid" : ""} />
                                {productErrors.stock && <span className="error">{productErrors.stock}</span>}
                            </label>
                        </div>

                        <div className="form-row">
                            <label>
                                Размер
                                <input name="size" value={product.size} onChange={handleProductChange}
                                    placeholder="9 × 9 м" />
                            </label>

                            <label>
                                Площадь, м²
                                <input name="area" value={product.area} onChange={handleProductChange}
                                    placeholder="76.9"
                                    className={productErrors.area ? "invalid" : ""} />
                                {productErrors.area && <span className="error">{productErrors.area}</span>}
                            </label>

                            <label>
                                Срок
                                <input name="buildTime" value={product.buildTime} onChange={handleProductChange}
                                    placeholder="3 месяца" />
                            </label>
                        </div>

                        <label>
                            Описание
                            <textarea name="description" value={product.description}
                                onChange={handleProductChange} rows="3" />
                        </label>

                        <label>
                            Ссылка на изображение
                            <input name="imageUrl" value={product.imageUrl} onChange={handleProductChange}
                                placeholder="/img/houses/house-01.jpg" />
                        </label>

                        {productError && <p className="error">{productError}</p>}
                        {productOk && <p className="ok-text">{productOk}</p>}

                        <div className="form-actions">
                            <button className="beautiful-button" type="submit">
                                {editingProductId ? "Сохранить изменения" : "Добавить дом"}
                            </button>
                            {editingProductId && (
                                <button className="link-button" type="button" onClick={() => {
                                    setEditingProductId(null);
                                    setProduct(EMPTY_PRODUCT);
                                    setProductError(null);
                                }}>
                                    Отменить редактирование
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="admin-panel">
                        <h3 className="admin-section-title">Дома в каталоге</h3>

                        <div className="table-wrap">
                            <table className="table admin-table-wide">
                                <thead>
                                    <tr>
                                        <th>Название</th>
                                        <th>Категория</th>
                                        <th>Размер</th>
                                        <th>Площадь</th>
                                        <th>Цена</th>
                                        <th>Скидка</th>
                                        <th>Статус</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((p) => (
                                        <tr key={p.productId}>
                                            <td>{p.title}</td>
                                            <td>{p.categoryTitle}</td>
                                            <td className="nowrap">{p.size ?? "—"}</td>
                                            <td className="nowrap">{p.area ? `${Number(p.area)} м²` : "—"}</td>
                                            <td className="nowrap">
                                                {Number(p.price).toLocaleString("ru-RU")} ₽
                                            </td>
                                            <td className="nowrap">{p.discountPercent > 0 ? `-${p.discountPercent}%` : "—"}</td>
                                            <td className="nowrap">
                                                <span className={`status-chip ${p.isActive ? "ok" : "bad"}`}>
                                                    {p.isActive ? "Активен" : "Скрыт"}
                                                </span>
                                            </td>
                                            <td className="nowrap">
                                                <button className="link-button" onClick={() => startProductEdit(p)}>
                                                    Изменить
                                                </button>
                                                {" "}
                                                <button
                                                    className={`link-button ${p.isActive ? "danger-link" : ""}`}
                                                    onClick={() => handleProductStatus(p)}
                                                >
                                                    {p.isActive ? "Скрыть" : "Вернуть"}
                                                </button>
                                                {" "}
                                                <button
                                                    className="link-button danger-link"
                                                    onClick={() => handleProductDelete(p)}
                                                >
                                                    Удалить
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {tab === "categories" && (
                <div className="admin-grid">
                    <form className="shop-form" onSubmit={handleCategory}>
                        <h3>{editingCategoryId ? "Изменить категорию" : "Добавить категорию"}</h3>

                        <label>
                            Название
                            <input value={categoryTitle} onChange={(e) => setCategoryTitle(e.target.value)}
                                placeholder="Каркасные дома" />
                        </label>

                        <label>
                            Описание
                            <textarea value={categoryDescription}
                                onChange={(e) => setCategoryDescription(e.target.value)} rows="3" />
                        </label>

                        {categoryError && <p className="error">{categoryError}</p>}
                        {categoryOk && <p className="ok-text">{categoryOk}</p>}

                        <div className="form-actions">
                            <button className="beautiful-button" type="submit">
                                {editingCategoryId ? "Сохранить изменения" : "Добавить категорию"}
                            </button>
                            {editingCategoryId && (
                                <button className="link-button" type="button" onClick={() => {
                                    setEditingCategoryId(null);
                                    setCategoryTitle("");
                                    setCategoryDescription("");
                                    setCategoryError(null);
                                }}>
                                    Отменить редактирование
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="admin-panel">
                        <h3 className="admin-section-title">Категории</h3>

                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Название</th>
                                        <th>Описание</th>
                                        <th>Статус</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map((c) => (
                                        <tr key={c.categoryId}>
                                            <td>{c.title}</td>
                                            <td className="muted cell-comment">{c.description || "—"}</td>
                                            <td className="nowrap">
                                                <span className={`status-chip ${c.isActive ? "ok" : "bad"}`}>
                                                    {c.isActive ? "Активна" : "Скрыта"}
                                                </span>
                                            </td>
                                            <td className="nowrap">
                                                {c.title === "Без категории" ? (
                                                    <span className="muted">Системная</span>
                                                ) : (
                                                    <>
                                                        <button className="link-button" onClick={() => startCategoryEdit(c)}>
                                                            Изменить
                                                        </button>
                                                        {" "}
                                                        <button
                                                            className={`link-button ${c.isActive ? "" : "danger-link"}`}
                                                            onClick={() => handleCategoryStatus(c)}
                                                        >
                                                            {c.isActive ? "Скрыть" : "Вернуть"}
                                                        </button>
                                                        {" "}
                                                        <button
                                                            className="link-button danger-link"
                                                            onClick={() => handleCategoryDelete(c)}
                                                        >
                                                            Удалить
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {tab === "coupons" && (
                <div className="admin-grid">
                    <form className="shop-form" onSubmit={handleCoupon}>
                        <h3>{editingCouponId ? "Изменить купон" : "Выдать купон"}</h3>

                        <div className="radio-row">
                            <label>
                                <input
                                    type="radio"
                                    name="target"
                                    value="user"
                                    checked={target === "user"}
                                    onChange={(e) => setTarget(e.target.value)}
                                />
                                Покупателю
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="target"
                                    value="product"
                                    checked={target === "product"}
                                    onChange={(e) => setTarget(e.target.value)}
                                />
                                На дом
                            </label>
                        </div>

                        <label>
                            Код
                            <input name="code" value={values.code} onChange={handleChange}
                                placeholder="SPRING2026" className={errors.code ? "invalid" : ""} />
                            {errors.code && <span className="error">{errors.code}</span>}
                        </label>

                        <div className="form-row">
                            <label>
                                Скидка, %
                                <input name="discountPercent" type="number" min="1" max="99" step="1"
                                    value={values.discountPercent} onChange={handleChange}
                                    placeholder="15" className={errors.discountPercent ? "invalid" : ""} />
                                {errors.discountPercent && <span className="error">{errors.discountPercent}</span>}
                            </label>

                            <label>
                                Мин. сумма, ₽
                                <input name="minOrderAmount" value={values.minOrderAmount} onChange={handleChange}
                                    placeholder="необязательно" />
                            </label>
                        </div>

                        {target === "user" ? (
                            <label>
                                Покупатель
                                <select name="userId" value={values.userId} onChange={handleChange}
                                    className={errors.userId ? "invalid" : ""}>
                                    <option value="">— выберите —</option>
                                    {users.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.fullName} ({u.email})
                                        </option>
                                    ))}
                                </select>
                                {errors.userId && <span className="error">{errors.userId}</span>}
                            </label>
                        ) : (
                            <label>
                                Дом
                                <select name="productId" value={values.productId} onChange={handleChange}
                                    className={errors.productId ? "invalid" : ""}>
                                    <option value="">— выберите —</option>
                                    {products.map((p) => (
                                        <option key={p.productId} value={p.productId}>
                                            {p.title}
                                        </option>
                                    ))}
                                </select>
                                {errors.productId && <span className="error">{errors.productId}</span>}
                            </label>
                        )}

                        {formError && <p className="error">{formError}</p>}
                        {couponOk && <p className="ok-text">{couponOk}</p>}

                        <div className="form-actions">
                            <button className="beautiful-button" type="submit" disabled={submitting}>
                                {submitting ? "Сохраняем…" : editingCouponId ? "Сохранить изменения" : "Выдать купон"}
                            </button>
                            {editingCouponId && (
                                <button className="link-button" type="button" onClick={resetCouponForm}>
                                    Отменить редактирование
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="admin-panel">
                        <h3 className="admin-section-title">Все купоны</h3>

                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Код</th>
                                        <th>Скидка</th>
                                        <th>Кому</th>
                                        <th>Статус</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coupons.map((c) => (
                                        <tr key={c.couponId}>
                                            <td><b>{c.code}</b></td>
                                            <td className="nowrap">-{c.discountPercent}%</td>
                                            <td>{c.userName ?? c.productTitle ?? "—"}</td>
                                            <td className="nowrap">
                                                <span className={`status-chip ${c.isUsed ? "bad" : "ok"}`}>
                                                    {c.isUsed ? "Использован" : "Активен"}
                                                </span>
                                            </td>
                                            <td className="nowrap">
                                                {!c.isUsed && (
                                                    <button className="link-button" onClick={() => startCouponEdit(c)}>
                                                        Изменить
                                                    </button>
                                                )}
                                                {" "}
                                                <button className="link-button danger-link" onClick={() => handleDelete(c.couponId)}>
                                                    Удалить
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Admin;
