import { useEffect, useState } from "react";
import { CartContext } from "./CartContext";

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem("cart");

      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  function addToCart(item) {
    setCart((cart) => {
      const product = cart.find((cartItem) => cartItem.id === item.id);

      if (product) {
        return cart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }

      return [...cart, { ...item, quantity: 1 }];
    });
  }

  function removeOneFromCart(id) {
    setCart((cart) =>
      cart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(id) {
    setCart((cart) => cart.filter((item) => item.id !== id));
  }

  function clearCart() {
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
