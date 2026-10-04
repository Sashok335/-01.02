import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../contexts/CartContext";
import { AuthContext } from "../contexts/AuthContext";
import { checkout } from "../api/purchases";
import { createMyAddress, deleteMyAddress, getMyAddresses } from "../api/addresses";

function ProductCart() {
    const { cart, addToCart, removeOneFromCart, removeFromCart, clearCart, total } = useContext(CartContext);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [couponCode, setCouponCode] = useState("");
    const [addresses, setAddresses] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState("");
    const [newAddressLabel, setNewAddressLabel] = useState("");
    const [newAddressText, setNewAddressText] = useState("");
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [addressError, setAddressError] = useState(null);
    const [addressOwnerId, setAddressOwnerId] = useState(null);
    const [savingAddress, setSavingAddress] = useState(false);
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const userId = user?.id;
    const primaryAddress = user?.primaryAddress;
    const addressesLoading = Boolean(userId && addressOwnerId !== userId);
    const visibleAddresses = addressOwnerId === userId ? addresses : [];

    useEffect(() => {
        if (!userId) return undefined;

        let alive = true;
        getMyAddresses()
            .then((result) => {
                if (!alive) return;
                setAddresses(result);
                setAddressOwnerId(userId);
                setSelectedAddress(primaryAddress ? "primary" : "");
                setAddressError(null);
            })
            .catch((error) => {
                if (!alive) return;
                setAddressOwnerId(userId);
                setAddressError(error.message);
            });

        return () => { alive = false; };
    }, [userId, primaryAddress]);

    const shippingAddress = selectedAddress === "primary"
        ? primaryAddress?.trim()
        : visibleAddresses.find((address) => selectedAddress === `saved-${address.id}`)?.address;

    async function handleAddAddress() {
        setAddressError(null);
        setSavingAddress(true);
        try {
            const address = await createMyAddress({
                label: newAddressLabel.trim() || "Другой адрес",
                address: newAddressText.trim(),
            });
            setAddresses((current) => [...current, address]);
            setSelectedAddress(`saved-${address.id}`);
            setNewAddressLabel("");
            setNewAddressText("");
            setShowAddressForm(false);
        } catch (error) {
            setAddressError(error.message);
        } finally {
            setSavingAddress(false);
        }
    }

    async function handleDeleteAddress(address) {
        setAddressError(null);
        try {
            await deleteMyAddress(address.id);
            setAddresses((current) => current.filter((saved) => saved.id !== address.id));
            if (selectedAddress === `saved-${address.id}`) {
                setSelectedAddress(primaryAddress ? "primary" : "");
            }
        } catch (error) {
            setAddressError(error.message);
        }
    }

    // Отправляем на сервер только id и количество.
    // Названия и цены остаются в корзине только для показа.
    async function handleCheckout(e) {
        e.preventDefault();
        setFormError(null);

        if (!user) {
            navigate("/login");
            return;
        }
        if (!shippingAddress) {
            setFormError("Выберите адрес доставки или добавьте его в профиле.");
            return;
        }

        setSubmitting(true);
        try {
            await checkout({
                items: cart.map((item) => ({
                    productId: item.id,
                    quantity: item.quantity,
                })),
                couponCode: couponCode.trim() || null,
                shippingAddress,
            });

            // Скидку посчитал сервер — она уже в базе. Своих чисел тут не считаем.
            clearCart();
            navigate("/dashboard");
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (cart.length === 0) {
        return (
            <div className="cart-page">
                <h2>Корзина</h2>
                <p>Корзина пуста</p>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <h2>Корзина</h2>

            {/* Слева — что берём, справа — как оформляем.
                На узком экране блоки встают друг под другом. */}
            <div className="cart-layout">
                <div className="cart-lines">
                    {cart.map((item) => (
                        <div className="cart-item" key={item.id}>
                            <img src={item.image} alt={item.name} />

                            <div className="cart-item-info">
                                <p className="cart-item-name">{item.name}</p>
                                <p className="muted">{Number(item.price).toLocaleString("ru-RU")} руб. за шт.</p>

                                <div className="cart-quantity">
                                    <button className="beautiful-button" onClick={() => removeOneFromCart(item.id)}>-</button>
                                    <span>{item.quantity} шт.</span>
                                    <button className="beautiful-button" onClick={() => addToCart(item)}>+</button>
                                </div>
                            </div>

                            <div className="cart-item-sum">
                                <b>{(Number(item.price) * item.quantity).toLocaleString("ru-RU")} руб.</b>
                                <button className="link-button" onClick={() => removeFromCart(item.id)}>
                                    Удалить
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className="cart-clear">
                        <button className="link-button" onClick={clearCart}>Очистить корзину</button>
                    </div>
                </div>

                <form className="checkout-form" onSubmit={handleCheckout}>
                    <h3>Оформление</h3>

                    <label>
                        Промокод
                        <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="WELCOME10"
                        />
                    </label>

                    {user ? (
                        <div className="delivery-addresses">
                            <label>
                                Адрес доставки
                                <select
                                    value={selectedAddress}
                                    onChange={(event) => setSelectedAddress(event.target.value)}
                                    disabled={addressesLoading}
                                >
                                    <option value="">
                                        {addressesLoading ? "Загружаем адреса…" : "— выберите адрес —"}
                                    </option>
                                    {primaryAddress && (
                                        <option value="primary">
                                            Основной — {primaryAddress}
                                        </option>
                                    )}
                                    {visibleAddresses.map((address) => (
                                        <option key={address.id} value={`saved-${address.id}`}>
                                            {address.label} — {address.address}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {visibleAddresses.length > 0 && (
                                <div className="saved-addresses">
                                    <span className="muted">
                                        Дополнительные адреса ({visibleAddresses.length}/5)
                                    </span>
                                    {visibleAddresses.map((address) => (
                                        <div className="saved-address" key={address.id}>
                                            <span><b>{address.label}</b><br />{address.address}</span>
                                            <button
                                                className="link-button"
                                                type="button"
                                                onClick={() => handleDeleteAddress(address)}
                                                aria-label={`Удалить адрес: ${address.label}`}
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!addressesLoading && visibleAddresses.length < 5 && (
                                <>
                                    <button
                                        className="address-toggle"
                                        type="button"
                                        aria-expanded={showAddressForm}
                                        aria-controls="add-address-form"
                                        onClick={() => setShowAddressForm((shown) => !shown)}
                                    >
                                        {showAddressForm ? "Скрыть форму" : "＋ Добавить адрес"}
                                    </button>
                                    {showAddressForm && (
                                        <div className="add-address" id="add-address-form">
                                            <span className="muted">
                                                Дополнительный адрес ({visibleAddresses.length}/5)
                                            </span>
                                            <label>
                                                Название
                                                <input
                                                    type="text"
                                                    value={newAddressLabel}
                                                    onChange={(event) => setNewAddressLabel(event.target.value)}
                                                    maxLength="50"
                                                    placeholder="Например, Работа"
                                                />
                                            </label>
                                            <label>
                                                Адрес
                                                <textarea
                                                    value={newAddressText}
                                                    onChange={(event) => setNewAddressText(event.target.value)}
                                                    maxLength="300"
                                                    rows="2"
                                                    placeholder="Город, улица, дом, квартира"
                                                />
                                            </label>
                                            <button
                                                className="link-button address-add-button"
                                                type="button"
                                                disabled={savingAddress || newAddressText.trim().length < 3}
                                                onClick={handleAddAddress}
                                            >
                                                {savingAddress ? "Сохраняем…" : "Сохранить адрес"}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                            {!addressesLoading && visibleAddresses.length >= 5 && (
                                <p className="muted">Можно сохранить не больше 5 дополнительных адресов.</p>
                            )}
                            {addressError && <p className="error">{addressError}</p>}
                        </div>
                    ) : (
                        <p className="muted">Войдите, чтобы выбрать сохранённый адрес доставки.</p>
                    )}

                    <div className="checkout-total">
                        <span>Итого</span>
                        <b>{total.toLocaleString("ru-RU")} руб.</b>
                    </div>

                    <p className="muted">
                        Скидку посчитает сервер при оформлении — здесь она не рассчитывается.
                    </p>

                    {formError && <p className="error">{formError}</p>}

                    <button className="beautiful-button" type="submit" disabled={submitting}>
                        {submitting ? "Оформляем…" : user ? "Оформить заказ" : "Войти и оформить"}
                    </button>

                    {!user && (
                        <p className="muted">Чтобы оформить заказ, сначала войдите.</p>
                    )}
                </form>
            </div>
        </div>
    );
}

export default ProductCart;