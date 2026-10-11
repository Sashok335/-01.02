import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { getMyPurchases } from "../api/purchases";
import { getMyCoupons } from "../api/coupons";
import { updateProfile } from "../api/auth";
import { errorText } from "../api/client";

const STATUS = {
    pending:   { label: "Ожидает оплаты", tone: "pending" },
    paid:      { label: "Оплачен",       tone: "ok" },
    shipped:   { label: "Отправлен",     tone: "ok" },
    cancelled: { label: "Отменён",       tone: "bad" },
    refunded:  { label: "Возврат",       tone: "bad" },
};

const SOURCE = {
    personal:         "ваш купон",
    product:          "акция на дом",
    product_discount: "скидка дома",
    none:             null,
};

function Dashboard() {
    const { user, checking, logout, updateUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const isAdmin = user?.role?.name === "admin";

    const [orders, setOrders] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState(() => ({
        fullName: user?.fullName ?? "",
        email: user?.email ?? "",
        phone: user?.phone ?? "",
        primaryAddress: user?.primaryAddress ?? "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    }));
    const [profileError, setProfileError] = useState(null);
    const [profileDetails, setProfileDetails] = useState({});
    const [profileMessage, setProfileMessage] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [editingProfile, setEditingProfile] = useState(false);

    useEffect(() => {
        if (checking) return;
        if (!user) {
            navigate("/login");
            return;
        }
        if (isAdmin) {
            setLoading(false);
            return;
        }

        let alive = true;

        Promise.all([getMyPurchases(), getMyCoupons()])
            .then(([o, c]) => {
                if (!alive) return;
                setOrders(o);
                setCoupons(c);
                setError(null);
            })
            .catch((e) => { if (alive) setError(errorText(e, "Не удалось загрузить личный кабинет")); })
            .finally(() => { if (alive) setLoading(false); });

        return () => { alive = false; };
    }, [user, isAdmin, checking, navigate]);

    function handleProfileChange(event) {
        const { name, value } = event.target;
        setProfile((current) => ({ ...current, [name]: value }));
        setProfileDetails((current) => ({ ...current, [name]: undefined }));
        setProfileError(null);
        setProfileMessage(null);
    }

    async function handleProfileSubmit(event) {
        event.preventDefault();
        setProfileError(null);
        setProfileMessage(null);
        setProfileDetails({});

        if (profile.newPassword !== profile.confirmPassword) {
            setProfileDetails({ confirmPassword: "Пароли не совпадают" });
            return;
        }

        setSavingProfile(true);
        try {
            const updated = await updateProfile({
                fullName: profile.fullName,
                email: profile.email,
                phone: profile.phone,
                ...(isAdmin ? {} : { primaryAddress: profile.primaryAddress }),
                currentPassword: profile.currentPassword || undefined,
                newPassword: profile.newPassword || undefined,
            });
            updateUser(updated);
            setProfile((current) => ({
                ...current,
                fullName: updated.fullName,
                email: updated.email,
                phone: updated.phone ?? "",
                primaryAddress: updated.primaryAddress ?? "",
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            }));
            setProfileMessage("Данные профиля сохранены");
            setEditingProfile(false);
        } catch (e) {
            setProfileError(errorText(e, "Не удалось сохранить профиль"));
            if (e.details) setProfileDetails(e.details);
        } finally {
            setSavingProfile(false);
        }
    }

    if (checking) return <p className="muted center">Проверяем вход…</p>;
    if (!user) return null;

    // У администратора нет покупок, адресов и корзины — только панель управления.
    if (isAdmin) {
        return (
            <div className="dashboard">
                <div className="profile-card">
                    <div className="avatar">{user.fullName.charAt(0)}</div>
                    <div className="profile-info">
                        <h2>{user.fullName}</h2>
                        <p className="muted">{user.email}</p>
                        <span className="role-chip">администратор</span>
                    </div>
                    <div className="profile-actions">
                        <button className="beautiful-button" onClick={() => navigate("/admin")}>
                            Перейти в админку
                        </button>
                        <button className="link-button" onClick={() => { logout(); navigate("/"); }}>
                            Выйти
                        </button>
                    </div>
                </div>
                <p className="muted" style={{ marginTop: 20 }}>
                    Для администратора покупки и корзина недоступны.
                </p>
            </div>
        );
    }

    const live = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
    const spent = live.reduce((sum, o) => sum + Number(o.totalPrice), 0);
    const saved = live.reduce(
        (sum, o) => sum + o.items.reduce(
            (s, it) => s + (Number(it.pricePerUnit) * it.quantity - Number(it.totalPrice)), 0),
        0);

    return (
        <div className="dashboard">
            <div className="profile-card">
                <div className="avatar">{user.fullName.charAt(0)}</div>

                <div className="profile-info">
                    <h2>{user.fullName}</h2>
                    <p className="muted">{user.email}</p>
                    {user.phone && <p className="muted">{user.phone}</p>}
                    <span className="role-chip">{user.role?.name}</span>
                </div>

                <div className="profile-actions">
                    <button
                        className="profile-edit-button"
                        type="button"
                        aria-expanded={editingProfile}
                        aria-controls={editingProfile ? "profile-edit-form" : undefined}
                        onClick={() => {
                            setEditingProfile((editing) => !editing);
                            setProfileError(null);
                            setProfileDetails({});
                            setProfileMessage(null);
                        }}
                    >
                        {editingProfile ? "Закрыть" : "Изменить профиль"}
                    </button>
                    <button className="link-button" onClick={() => { logout(); navigate("/"); }}>
                        Выйти
                    </button>
                </div>
            </div>

            {!editingProfile && profileMessage && (
                <p className="ok-text profile-feedback" role="status">{profileMessage}</p>
            )}

            {editingProfile && <form
                id="profile-edit-form"
                className="shop-form profile-edit-form"
                onSubmit={handleProfileSubmit}
            >
                <div>
                    <span className="section-eyebrow">ЛИЧНЫЕ ДАННЫЕ</span>
                    <h3>Настройки профиля</h3>
                    <p className="muted">Чтобы сменить email или пароль, подтвердите текущий пароль.</p>
                </div>

                <label>
                    Имя
                    <input name="fullName" value={profile.fullName} onChange={handleProfileChange} required />
                    {profileDetails.fullName && <span className="error">{profileDetails.fullName}</span>}
                </label>

                <label>
                    Email
                    <input name="email" type="email" value={profile.email} onChange={handleProfileChange} required />
                    {profileDetails.email && <span className="error">{profileDetails.email}</span>}
                </label>

                <label>
                    Телефон
                    <input
                        name="phone"
                        type="tel"
                        value={profile.phone}
                        onChange={handleProfileChange}
                        placeholder="+7 (999) 123-45-67"
                    />
                    {profileDetails.phone && <span className="error">{profileDetails.phone}</span>}
                </label>

                <label className="profile-address-field">
                    Основной адрес доставки
                    <textarea
                        name="primaryAddress"
                        value={profile.primaryAddress}
                        onChange={handleProfileChange}
                        rows="2"
                        maxLength="300"
                        placeholder="Город, улица, дом, квартира"
                    />
                    {profileDetails.primaryAddress && (
                        <span className="error">{profileDetails.primaryAddress}</span>
                    )}
                </label>

                <label>
                    Текущий пароль
                    <input
                        name="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        value={profile.currentPassword}
                        onChange={handleProfileChange}
                        placeholder="Нужен для смены email или пароля"
                    />
                    {profileDetails.currentPassword && <span className="error">{profileDetails.currentPassword}</span>}
                </label>

                <label>
                    Новый пароль
                    <input
                        name="newPassword"
                        type="password"
                        autoComplete="new-password"
                        value={profile.newPassword}
                        onChange={handleProfileChange}
                        placeholder="Оставь пустым, чтобы не менять"
                    />
                    {profileDetails.newPassword && <span className="error">{profileDetails.newPassword}</span>}
                </label>

                <label>
                    Повтори новый пароль
                    <input
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        value={profile.confirmPassword}
                        onChange={handleProfileChange}
                    />
                    {profileDetails.confirmPassword && <span className="error">{profileDetails.confirmPassword}</span>}
                </label>

                {profileError && <p className="error">{profileError}</p>}
                {profileMessage && <p className="ok-text">{profileMessage}</p>}
                <button className="beautiful-button" type="submit" disabled={savingProfile}>
                    {savingProfile ? "Сохраняем…" : "Сохранить профиль"}
                </button>
            </form>}

            <div className="stat-row">
                <div className="stat">
                    <span className="muted">Заказов</span>
                    <b>{orders.length}</b>
                </div>
                <div className="stat">
                    <span className="muted">Покупок на сумму</span>
                    <b>{spent.toLocaleString("ru-RU")} ₽</b>
                </div>
                <div className="stat">
                    <span className="muted">Сэкономлено на скидках</span>
                    <b className="accent">{saved.toLocaleString("ru-RU")} ₽</b>
                </div>
                <div className="stat">
                    <span className="muted">Активных купонов</span>
                    <b>{coupons.length}</b>
                </div>
            </div>

            <div className="section-heading">
                <div>
                    <span className="section-eyebrow">ВАШИ ВЫГОДЫ</span>
                    <h2>Мои купоны</h2>
                </div>
                <p className="muted">Скопируйте код и введите его в корзине при оформлении.</p>
            </div>

            {coupons.length === 0 ? (
                <p className="muted">Действующих купонов нет</p>
            ) : (
                <div className="coupon-list">
                    {coupons.map((c) => (
                        <div className="coupon" key={c.couponId}>
                            <div className="coupon-main">
                                <span className="coupon-code-label">ПЕРСОНАЛЬНЫЙ КУПОН</span>
                                <b className="coupon-code">{c.code}</b>
                                <span className="coupon-description">
                                    Скидка {c.discountPercent}% на подходящие дома в заказе.
                                    Применяется, только если она выгоднее скидки самого дома.
                                </span>
                            </div>
                            <div className="coupon-details">
                                <span className="coupon-off">-{c.discountPercent}%</span>
                                <span className="coupon-condition">
                                    {Number(c.minOrderAmount) > 0
                                        ? `Заказ от ${Number(c.minOrderAmount).toLocaleString("ru-RU")} ₽`
                                        : "Без минимальной суммы"}
                                </span>
                                <span className="coupon-condition">Одноразовый · скидки не суммируются</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <h2>Мои заказы</h2>

            {loading && <p className="muted">Загрузка заказов…</p>}

            {error && (
                <div className="error">
                    <p>{error}</p>
                </div>
            )}

            {!loading && !error && orders.length === 0 && (
                <p className="muted">Заказов пока нет</p>
            )}

            {!loading && !error && orders.length > 0 && (
                <div className="order-list">
                    {orders.map((order) => {
                        const status = STATUS[order.status] ?? { label: order.status, tone: "" };

                        return (
                            <div className="order-card" key={order.orderId}>
                                <div className="order-head">
                                    <div>
                                        <b>Заказ {order.orderNumber}</b>
                                        <span className="muted"> · {order.createdAtFormatted}</span>
                                    </div>
                                    <span className={`status-chip ${status.tone}`}>{status.label}</span>
                                </div>

                                <p className="muted">
                                    Доставка: {order.deliveryDateFormatted} · {order.shippingAddress}
                                </p>

                                <ul className="order-items">
                                    {order.items.map((it) => (
                                        <li key={it.purchaseId}>
                                            <span>{it.productTitle}</span>
                                            <span className="muted">
                                                {it.quantity} шт. ·{" "}
                                                {it.discountPercent > 0
                                                    ? `-${it.discountPercent}% (${SOURCE[it.discountSource] ?? ""})`
                                                    : "без скидки"}
                                            </span>
                                            <b>{Number(it.totalPrice).toLocaleString("ru-RU")} ₽</b>
                                        </li>
                                    ))}
                                </ul>

                                <div className="order-total">
                                    <span>Итого по заказу</span>
                                    <b>{Number(order.totalPrice).toLocaleString("ru-RU")} ₽</b>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default Dashboard;
