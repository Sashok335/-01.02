import { useContext, useEffect, useRef, useState } from "react";
import { CartContext } from "./CartContext";
import { AuthContext } from "./AuthContext";
import {
    getCart,
    addCartItem,
    setCartItem,
    removeCartItem,
    clearCart as clearCartApi,
} from "../api/cart";

const LOCAL_KEY = "cart";
const MAX_QUANTITY = 10;

function readLocal() {
    try {
        const raw = localStorage.getItem(LOCAL_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function writeLocal(items) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

// Единый вид позиции корзины: и для гостя, и для сервера.
function mapServerItem(item) {
    return {
        id: item.productId,
        name: item.title,
        price: Number(item.priceFinal),
        image: item.imageUrl,
        quantity: item.quantity,
        stock: item.stock,
    };
}

function limitFor(item) {
    if (item.stock === null || item.stock === undefined) return MAX_QUANTITY;
    return Math.min(MAX_QUANTITY, item.stock);
}

export function CartProvider({ children }) {
    const { user, checking } = useContext(AuthContext);
    const [cart, setCart] = useState([]);
    const userId = user?.id ?? null;
    const mergedFor = useRef(null);

    // При входе переносим гостевую корзину на сервер, затем берём серверную.
    useEffect(() => {
        if (checking) return undefined;
        let alive = true;

        if (!userId) {
            mergedFor.current = null;
            setCart(readLocal());
            return () => { alive = false; };
        }

        (async () => {
            if (mergedFor.current !== userId) {
                const local = readLocal();
                for (const item of local) {
                    try {
                        await addCartItem(item.id, item.quantity);
                    } catch {
                        // позицию могли убрать из каталога — просто пропускаем
                    }
                }
                if (local.length) writeLocal([]);
                mergedFor.current = userId;
            }

            const data = await getCart();
            if (alive) setCart(data.items.map(mapServerItem));
        })().catch(() => {});

        return () => { alive = false; };
    }, [userId, checking]);

    // Гостевая корзина сохраняется локально.
    useEffect(() => {
        if (!userId) writeLocal(cart);
    }, [cart, userId]);

    async function addToCart(item) {
        if (userId) {
            try {
                const data = await addCartItem(item.id, 1);
                setCart(data.items.map(mapServerItem));
            } catch {
                // лимит/наличие — состояние не меняем
            }
            return;
        }

        setCart((current) => {
            const found = current.find((c) => c.id === item.id);

            if (found) {
                return current.map((c) =>
                    c.id === item.id
                        ? { ...c, quantity: Math.min(c.quantity + 1, limitFor(c)) }
                        : c
                );
            }
            if (limitFor(item) < 1) return current;
            return [...current, { ...item, quantity: 1 }];
        });
    }

    async function removeOneFromCart(id) {
        if (userId) {
            const found = cart.find((c) => c.id === id);
            const next = found ? found.quantity - 1 : 0;
            try {
                const data = next <= 0
                    ? await removeCartItem(id)
                    : await setCartItem(id, next);
                setCart(data.items.map(mapServerItem));
            } catch {
                // ignore
            }
            return;
        }

        setCart((current) =>
            current
                .map((item) =>
                    item.id === id
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );
    }

    async function removeFromCart(id) {
        if (userId) {
            try {
                const data = await removeCartItem(id);
                setCart(data.items.map(mapServerItem));
            } catch {
                // ignore
            }
            return;
        }
        setCart((current) => current.filter((item) => item.id !== id));
    }

    async function clearCart() {
        if (userId) {
            try {
                const data = await clearCartApi();
                setCart(data.items.map(mapServerItem));
            } catch {
                // ignore
            }
            return;
        }
        setCart([]);
    }

    const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeOneFromCart, removeFromCart, clearCart, total, cartCount }}>
            {children}
        </CartContext.Provider>
    );
}
