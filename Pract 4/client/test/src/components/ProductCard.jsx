import { useContext, useState } from "react";
import { CartContext } from "../contexts/CartContext";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ReviewsModal from "./ReviewsModal";

// Карточка дома со строгой разметкой: каждая характеристика — на своей строке,
// футер (цена, отзывы, кнопки) всегда прижат к низу, поэтому у всех карточек
// блоки стоят на одном уровне независимо от длины текста.
function ProductCard({ product }) {
    const { cart, addToCart, removeOneFromCart } = useContext(CartContext);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [reviewsOpen, setReviewsOpen] = useState(false);

    const isAdmin = user?.role?.name === "admin";
    const inCart = cart.find((item) => item.id === product.productId);
    const count = inCart ? inCart.quantity : 0;

    const outOfStock = product.stock !== null && product.stock === 0;
    const limit = product.stock === null ? 10 : Math.min(10, product.stock);

    function putInCart() {
        addToCart({
            id: product.productId,
            name: product.title,
            price: Number(product.priceFinal),
            image: product.imageUrl,
            stock: product.stock,
        });
    }

    return (
        <article className="cardd">
            <div className="card-media">
                <img src={product.imageUrl} alt={product.title} />
                {product.hasDiscount && <span className="badge">-{product.discountPercent}%</span>}
            </div>

            <div className="card-body">
                <h2 className="card-title">{product.title}</h2>
                <p className="card-category">{product.categoryTitle}</p>

                <ul className="card-meta">
                    <li>
                        <span className="card-meta-label">Размер</span>
                        <span className="card-meta-value">{product.size || "—"}</span>
                    </li>
                    <li>
                        <span className="card-meta-label">Площадь</span>
                        <span className="card-meta-value">
                            {product.area ? `${Number(product.area)} м²` : "—"}
                        </span>
                    </li>
                    <li>
                        <span className="card-meta-label">Срок строительства</span>
                        <span className="card-meta-value">{product.buildTime || "—"}</span>
                    </li>
                </ul>

                <p className="card-desc">{product.description || "Описание уточняется."}</p>

                <div className="card-footer">
                    <div className="card-price">
                        {product.hasDiscount && <s>{Number(product.price).toLocaleString("ru-RU")} ₽</s>}
                        <b>{Number(product.priceFinal).toLocaleString("ru-RU")} ₽</b>
                    </div>

                    <button className="link-button card-reviews" type="button" onClick={() => setReviewsOpen(true)}>
                        Отзывы
                    </button>

                    <div className="card-actions">
                        {isAdmin ? (
                            <span className="muted">Только для покупателей</span>
                        ) : outOfStock ? (
                            <span className="error">Нет участков под строительство</span>
                        ) : count === 0 ? (
                            <button className="beautiful-button" onClick={() => {
                                putInCart();
                                navigate("/cart");
                            }}>
                                В корзину
                            </button>
                        ) : (
                            <div className="plusminus">
                                <button
                                    className="beautiful-button"
                                    disabled={count >= limit}
                                    onClick={putInCart}
                                >
                                    +
                                </button>
                                <span className="plusminus-count">{count} шт.</span>
                                <button className="beautiful-button" onClick={() => removeOneFromCart(product.productId)}>
                                    −
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {reviewsOpen && <ReviewsModal product={product} onClose={() => setReviewsOpen(false)} />}
        </article>
    );
}
export default ProductCard;
