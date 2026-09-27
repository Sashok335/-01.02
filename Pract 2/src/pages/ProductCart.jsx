import { useContext } from "react";
import { CartContext } from "../contexts/CartContext";

function ProductCart() {
    const { cart, addToCart, removeOneFromCart, removeFromCart, total } = useContext(CartContext);

    return (
        <div className="cart">
            <h2>Корзина</h2>

            {cart.length === 0 ? (
                <p>Корзина пуста</p>
            ) : (
                <>
                    {cart.map((item, index) => (
                        <div className="cart-item" key={index}>
                            <img src={item.image} alt={item.name} />
                            <div className="cart-item-info">
                                <p>{item.name} - {item.price} руб.</p> 
                                <div className="cart-quantity">
                                    <button className="beautiful-button" onClick={() => addToCart(item)}>+</button>
                                    <span>{item.quantity} шт.</span>
                                    <button className="beautiful-button" onClick={() => removeOneFromCart(item.id)}>-</button>
                                </div>
                            </div>

                            <button className="beautiful-button" onClick={() => removeFromCart(item.id)}>
                                Удалить
                            </button>
                        </div>
                    ))}

                    <h3>Итого: {total} руб.</h3>
                </>
            )}
        </div>
    );
}

export default ProductCart;