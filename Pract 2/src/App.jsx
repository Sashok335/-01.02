import './App.css'
import Cart from './pages/ProductCart';
import Home from'./pages/ProductList';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Navi from './components/NatusVincere';

import { BrowserRouter, Routes, Route,Link} from 'react-router-dom';
import { CartProvider } from './contexts/CartProvider';
import { ThemeProvider } from './contexts/ThemeProvider';

function App(){
  return(
    <ThemeProvider>
      <CartProvider>
        <BrowserRouter>
          <Navi />

          <Routes>
            <Route path="/" element={<Home />}></Route>
            <Route path="/cart" element={<Cart />}></Route>
            <Route path="/login" element={<Login />}></Route>
            <Route path="/dashboard" element={<Dashboard />}></Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </ThemeProvider>
)}


export default App
