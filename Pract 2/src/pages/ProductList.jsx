import ProductCard from '../components/ProductCard';
import {PRODUCTS_LIST} from '../data/products'


function Home() {
    return (
    <div className="cardss">
        {PRODUCTS_LIST.map((product)=>
        <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                image={product.image}
            />
        )}
        </div>
    )
}

export default Home