import { useContext } from "react";
import { CartContext } from "../contexts/CartContext";
import { useNavigate } from "react-router-dom";

function ProductCard({ product }) {
    const { cart, addToCart, removeOneFromCart } = useContext(CartContext);
    const navigate = useNavigate();

    const inCart = cart.find((item) => item.id === product.productId);
    const count = inCart ? inCart.quantity : 0;

    // stock === null означает «следить не надо», поэтому ноль — это конец.
    const outOfStock = product.stock !== null && product.stock === 0;

    // Кладём в корзину то, что прислал сервер: id, название, цену со скидкой.
    // Ключ id — тот же, по которому ищем товар в корзине.
    function putInCart() {
        addToCart({
            id: product.productId,
            name: product.title,
            price: Number(product.priceFinal),
            image: product.imageUrl,
        });
    }

    return (
        <div className="cardd">
            <img src={product.imageUrl} alt={product.title}></img>

            {product.hasDiscount && <span className="badge">-{product.discountPercent}%</span>}

            <h2>{product.title}</h2>
            <p className="muted">{product.categoryTitle}</p>

            <div className="card-price">
                {product.hasDiscount && <s>{Number(product.price).toLocaleString("ru-RU")} руб.</s>}
                <b>{Number(product.priceFinal).toLocaleString("ru-RU")} руб.</b>
            </div>

            {outOfStock ? (
                <p className="error">Нет в наличии</p>
            ) : count === 0 ? (
                <button className="beautiful-button" onClick={() => {
                    putInCart();
                    navigate("/cart");
                }}>
                    В корзину
                </button>
            ) : (
                <div className="plusminus">
                    <button className="beautiful-button" onClick={putInCart}>
                        +
                    </button>
                    <p style={{ marginTop: '10px' }}>{count} шт.</p>
                    <button className="beautiful-button" onClick={() => removeOneFromCart(product.productId)}>
                        -
                    </button>
                </div>
            )}
        </div>
    );
}
export default ProductCard;
