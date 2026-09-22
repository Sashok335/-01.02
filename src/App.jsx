import './App.css'
import ProductCard from './ProductCard';
import notebook_image from './assets/notebook.png'
import headphones_image from './assets/headphones.png'
import phone_image from './assets/phone.png'

function App(){
  return(
  <div className="cardss">
  <ProductCard
    name="Phone"
    price="89.999"
    image={phone_image}
      />
  
  <ProductCard 
    name="Ноутбук" 
    price={100000} 
    image={notebook_image}
      />

  <ProductCard 
    name="Наушники" 
    price={5000} 
    image={headphones_image} 
      />
</div>

)}


















// import Counter from "./Counter";

// function Welcome(props){
//   return(
//     <h1>Hi, {props.name}</h1>
//   )
// }

// function App() {
// const [message,setMessage]=useState("Push the button")

// function handleClick(){
//   setMessage("Button pushed")
// }
// {/*coment*/}
//   return(
//     <div>
//       <h1>Hi, React!</h1>
//       <p>My first app!</p>
//       <Welcome name="Alex"/>
//       <Welcome name="Necto"/>


//       <div>
//         <h1>{message}</h1>
//         <button onClick={handleClick}>Click</button>
//       </div>

//       <Counter />
//     </div>
//   );
// }

export default App
