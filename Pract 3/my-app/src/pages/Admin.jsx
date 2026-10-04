import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { getAllCoupons, createCoupon, updateCoupon, deleteCoupon } from "../api/coupons";
import { getUsers } from "../api/users";
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

// Сколько скидка на товаре: чаще всего 0.
const EMPTY_PRODUCT = {
    title: "",
    categoryId: "",
    price: "",
    discountPercent: "",
    stock: "",
    description: "",
    imageUrl: "",
};

function dateInputValue(value) {
    const [day, month, year] = value.split(".");
    return day && month && year ? `${year}-${month}-${day}` : value;
}

// Одна форма, два режима — переключает радиокнопка.
// В теле запроса отправляется РОВНО ОДНО из userId / productId:
// оба сразу база не пропустит.
function Admin() {
    const { user, checking } = useContext(AuthContext);
    const navigate = useNavigate();

    const [tab, setTab] = useState("coupons");

    const [users, setUsers] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [loadError, setLoadError] = useState(null);

    const [target, setTarget] = useState(() => user?.role?.canManageUsers ? "user" : "product");
    const [editingCouponId, setEditingCouponId] = useState(null);
    const [values, setValues] = useState({
        code: "",
        discountPercent: "",
        minOrderAmount: "",
        expiresAt: "",
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

    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }
        if (!user.role?.canManageGoods) {
            navigate("/dashboard");
            return;
        }

        let alive = true;

        Promise.all([
            getAllCoupons(),
            getAllProducts(),
            getAllCategories(),
            user.role?.canManageUsers ? getUsers() : Promise.resolve([]),
        ])
            .then(([couponRows, productRows, categoryRows, userRows]) => {
                if (!alive) return;
                setCoupons(couponRows);
                setProducts(productRows);
                setCategories(categoryRows);
                setUsers(userRows);
                setLoadError(null);
            })
            .catch((error) => { if (alive) setLoadError(error.message); });

        return () => { alive = false; };
    }, [user, navigate]);

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
            expiresAt: "",
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
            expiresAt: dateInputValue(coupon.expiresAt),
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
        if (!values.expiresAt) found.expiresAt = "Нужна дата";
        if (target === "user" && !values.userId) found.userId = "Выберите покупателя";
        if (target === "product" && !values.productId) found.productId = "Выберите товар";

        if (Object.keys(found).length) {
            setErrors(found);
            return;
        }

        setSubmitting(true);
        try {
            const body = {
                code: values.code,
                discountPercent: dp,
                expiresAt: values.expiresAt,
            };

            // Ровно одно из двух — иначе ошибка 422 от сервера.
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
            setFormError(err.message);
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
            setFormError(err.message);
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
            setCategoryError(err.message);
        }
    }

    function startCategoryEdit(category) {
        setEditingCategoryId(category.categoryId);
        setCategoryTitle(category.title);
        setCategoryDescription(category.description ?? "");
        setCategoryError(null);
        setCategoryOk(null);
    }

    async function handleCategoryStatus(category) {
        const isActive = !category.isActive;
        if (!isActive && !window.confirm(`Скрыть категорию «${category.title}» из каталога?`)) return;
        try {
            await (isActive
                ? updateCategory(category.categoryId, { isActive: true })
                : deleteCategory(category.categoryId));
            setCategories((current) => current.map((item) => item.categoryId === category.categoryId
                ? { ...item, isActive }
                : item));
        } catch (err) {
            setCategoryError(err.message);
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
        };

        try {
            const saved = editingProductId
                ? await updateProduct(editingProductId, body)
                : await createProduct(body);
            setProducts(await getAllProducts());
            setProductOk(editingProductId
                ? `Товар «${saved.title}» обновлён`
                : `Товар «${saved.title}» добавлен`);
            setEditingProductId(null);
            setProduct(EMPTY_PRODUCT);
        } catch (err) {
            setProductError(err.message);
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
        });
        setProductErrors({});
        setProductError(null);
        setProductOk(null);
    }

    async function handleProductStatus(item) {
        const isActive = !item.isActive;
        if (!isActive && !window.confirm(`Скрыть товар «${item.title}» из каталога?`)) return;
        try {
            await (isActive
                ? updateProduct(item.productId, { isActive: true })
                : deleteProduct(item.productId));
            setProducts((current) => current.map((productItem) => productItem.productId === item.productId
                ? { ...productItem, isActive }
                : productItem));
        } catch (err) {
            setProductError(err.message);
        }
    }

    if (checking) return <p className="muted center">Проверяем права…</p>;
    if (!user) return null;

    return (
        <div className="dashboard">
            <h2>Админка</h2>

            <div className="tabs">
                <button
                    type="button"
                    className={`tab ${tab === "coupons" ? "tab-active" : ""}`}
                    onClick={() => setTab("coupons")}
                >
                    Купоны
                </button>
                <button
                    type="button"
                    className={`tab ${tab === "products" ? "tab-active" : ""}`}
                    onClick={() => setTab("products")}
                >
                    Товары
                </button>
                <button
                    type="button"
                    className={`tab ${tab === "categories" ? "tab-active" : ""}`}
                    onClick={() => setTab("categories")}
                >
                    Категории
                </button>
            </div>

            {loadError && <p className="error">{loadError}</p>}

            {tab === "coupons" && (
                <div className="admin-grid">
                    <form className="shop-form" onSubmit={handleCoupon}>
                        <h3>{editingCouponId ? "Изменить купон" : "Выдать купон"}</h3>

                        <div className="radio-row">
                            {user.role?.canManageUsers && (
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
                            )}
                            <label>
                                <input
                                    type="radio"
                                    name="target"
                                    value="product"
                                    checked={target === "product"}
                                    onChange={(e) => setTarget(e.target.value)}
                                />
                                На товар
                            </label>
                        </div>

                        <label>
                            Код
                            <input name="code" value={values.code} onChange={handleChange}
                                placeholder="SPRING2026" className={errors.code ? "invalid" : ""} />
                            {errors.code && <span className="error">{errors.code}</span>}
                        </label>

                        <label>
                            Скидка, %
                            <input name="discountPercent" type="number" min="1" max="99" step="1"
                                value={values.discountPercent} onChange={handleChange}
                                placeholder="15" className={errors.discountPercent ? "invalid" : ""} />
                            {errors.discountPercent && <span className="error">{errors.discountPercent}</span>}
                        </label>

                        <label>
                            Минимальная сумма (необязательно)
                            <input name="minOrderAmount" value={values.minOrderAmount} onChange={handleChange}
                                placeholder="5000" />
                        </label>

                        <label>
                            Действует до
                            <input name="expiresAt" type="date" value={values.expiresAt} onChange={handleChange}
                                className={errors.expiresAt ? "invalid" : ""} />
                            {errors.expiresAt && <span className="error">{errors.expiresAt}</span>}
                        </label>

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
                                Товар
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

                        <button className="beautiful-button" type="submit" disabled={submitting}>
                            {submitting ? "Сохраняем…" : editingCouponId ? "Сохранить изменения" : "Выдать купон"}
                        </button>
                        {editingCouponId && (
                            <button className="link-button" type="button" onClick={resetCouponForm}>
                                Отменить редактирование
                            </button>
                        )}
                    </form>

                    <div>
                        <h3>Все купоны</h3>

                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Код</th>
                                    <th>Скидка</th>
                                    <th>Кому</th>
                                    <th>До</th>
                                    <th>Статус</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {coupons.map((c) => (
                                    <tr key={c.couponId}>
                                        <td><b>{c.code}</b></td>
                                        <td>-{c.discountPercent}%</td>
                                        <td>{c.userName ?? c.productTitle ?? "—"}</td>
                                        <td className="nowrap">{c.expiresAt}</td>
                                        <td>{c.isUsed ? "Использован" : c.isActive ? "Активен" : "Неактивен"}</td>
                                        <td>
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
            )}

            {tab === "products" && (
                <div className="admin-grid">
                    <form className="shop-form" onSubmit={handleProduct}>
                        <h3>{editingProductId ? "Изменить товар" : "Добавить товар"}</h3>

                        <label>
                            Название
                            <input name="title" value={product.title} onChange={handleProductChange}
                                placeholder="Смартфон Samsung Galaxy A55 8/128"
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

                        <label>
                            Цена, ₽
                            <input name="price" value={product.price} onChange={handleProductChange}
                                placeholder="27990"
                                className={productErrors.price ? "invalid" : ""} />
                            {productErrors.price && <span className="error">{productErrors.price}</span>}
                        </label>

                        <label>
                            Скидка, % (необязательно)
                            <input name="discountPercent" type="number" min="0" max="99" step="1"
                                value={product.discountPercent}
                                onChange={handleProductChange} placeholder="0"
                                className={productErrors.discountPercent ? "invalid" : ""} />
                            {productErrors.discountPercent && (
                                <span className="error">{productErrors.discountPercent}</span>
                            )}
                        </label>

                        <label>
                            Остаток (пусто = под заказ)
                            <input name="stock" value={product.stock} onChange={handleProductChange}
                                placeholder="10"
                                className={productErrors.stock ? "invalid" : ""} />
                            {productErrors.stock && <span className="error">{productErrors.stock}</span>}
                        </label>

                        <label>
                            Описание
                            <textarea name="description" value={product.description}
                                onChange={handleProductChange} rows="3" />
                        </label>

                        <label>
                            Ссылка на изображение
                            <input name="imageUrl" value={product.imageUrl} onChange={handleProductChange}
                                placeholder="https://example.com/product.jpg" />
                        </label>

                        {productError && <p className="error">{productError}</p>}
                        {productOk && <p className="ok-text">{productOk}</p>}

                        <button className="beautiful-button" type="submit">
                            {editingProductId ? "Сохранить изменения" : "Добавить товар"}
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
                    </form>

                    <div>
                        <h3>Товары в каталоге</h3>

                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Название</th>
                                    <th>Категория</th>
                                    <th>Цена</th>
                                    <th>Скидка</th>
                                    <th>Статус</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p) => (
                                    <tr key={p.productId}>
                                        <td>{p.title}</td>
                                        <td>{p.categoryTitle}</td>
                                        <td className="nowrap">
                                            {Number(p.price).toLocaleString("ru-RU")} ₽
                                        </td>
                                        <td>{p.discountPercent > 0 ? `-${p.discountPercent}%` : "—"}</td>
                                        <td>{p.isActive ? "Активен" : "Скрыт"}</td>
                                        <td>
                                            <button className="link-button" onClick={() => startProductEdit(p)}>
                                                Изменить
                                            </button>
                                            {" "}
                                            <button
                                                className={`link-button ${p.isActive ? "danger-link" : ""}`}
                                                onClick={() => handleProductStatus(p)}
                                            >
                                                {p.isActive ? "Скрыть" : "Восстановить"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
                                placeholder="Смартфоны и гаджеты" />
                        </label>

                        <label>
                            Описание
                            <textarea value={categoryDescription}
                                onChange={(e) => setCategoryDescription(e.target.value)} rows="3" />
                        </label>

                        {categoryError && <p className="error">{categoryError}</p>}
                        {categoryOk && <p className="ok-text">{categoryOk}</p>}

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
                    </form>

                    <div>
                        <h3>Категории</h3>

                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Название</th>
                                    <th>Описание</th>
                                    <th>Статус</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((c) => (
                                    <tr key={c.categoryId}>
                                        <td>{c.title}</td>
                                        <td className="muted">{c.description || "—"}</td>
                                        <td>{c.isActive ? "Активна" : "Скрыта"}</td>
                                        <td>
                                            <button className="link-button" onClick={() => startCategoryEdit(c)}>
                                                Изменить
                                            </button>
                                            {" "}
                                            <button
                                                className={`link-button ${c.isActive ? "danger-link" : ""}`}
                                                onClick={() => handleCategoryStatus(c)}
                                            >
                                                {c.isActive ? "Скрыть" : "Восстановить"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Admin;