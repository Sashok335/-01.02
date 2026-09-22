import {useState} from "react";

function ProductCard(props){
const [count,setCount]=useState(0);

return(
<div className="cardd">
    <img src={props.image} alt={props.name}></img>
    <h3>{props.name}</h3>
    <p>Цена:{props.price} руб.</p>
    {count===0 ? (<button onClick={()=>setCount(count+1)}>Добавить</button>):(<div className="plusminus"><button onClick={()=>setCount(count+1)}>+</button> <p>{count} шт.</p> <button onClick={()=>setCount(count-1)}>-</button></div>)}
</div>
)
}
export default ProductCard;