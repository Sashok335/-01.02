import './App.css'
import Cart from './pages/ProductCart';
import Home from'./pages/ProductList';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Navi from './components/NatusVincere';

import { BrowserRouter, Routes, Route} from 'react-router-dom';
import { CartProvider } from './contexts/CartProvider';
import { ThemeProvider } from './contexts/ThemeProvider';
import { AuthProvider } from './contexts/AuthProvider';

function App(){
  return(
    <ThemeProvider>
      <CartProvider>
        <AuthProvider>
          <BrowserRouter>
            <Navi />

            <Routes>
              <Route path="/" element={<Home />}></Route>
              <Route path="/cart" element={<Cart />}></Route>
              <Route path="/login" element={<Login />}></Route>
              <Route path="/dashboard" element={<Dashboard />}></Route>
              <Route path="/admin" element={<Admin />}></Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </CartProvider>
    </ThemeProvider>
)}

export default App
