import { useContext } from "react";
import { CartContext } from "../contexts/CartContext";
import { useNavigate } from "react-router-dom";

function ProductCard(props) {
    const { cart, addToCart, removeOneFromCart } = useContext(CartContext);
    const navigate = useNavigate();
    const product = cart.find((item) => item.id === props.id);
    const count = product ? product.quantity : 0;

    return (
        <div className="cardd">
            <img src={props.image} alt={props.name}></img>
            <h2 >{props.name}</h2>
            <p>Цена:{props.price} руб.</p>
            {count === 0 ? (
                <button className='beautiful-button' onClick={() => {
                    addToCart(props);
                    navigate("/cart");
                }}>
                    В корзину
                </button>
            ) : (
                <div className="plusminus">
                    <button className='beautiful-button' onClick={() => addToCart(props)}>
                        +
                    </button>
                    <p style={{ marginTop: '10px' }}>{count} шт.</p>
                    <button className='beautiful-button' onClick={() => removeOneFromCart(props.id)}>
                        -
                    </button>
                </div>
            )}
        </div>
    )
}
export default ProductCard;