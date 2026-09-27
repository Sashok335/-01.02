import { NavLink } from 'react-router-dom';
import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import { CartContext } from '../contexts/CartContext';
import Switch from './Switcher';

function Navi() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { cartCount } = useContext(CartContext);

  return (
    <div className="nav-bar">
      <nav>
        <NavLink
          to="/"
          style={({ isActive }) => ({
            color: isActive ? "#9500ff" : "white",
            fontWeight: isActive ? "bold" : "normal"
          })}
        >
          Главная
        </NavLink>
        <NavLink
          to="/cart"
          style={({ isActive }) => ({
            color: isActive ? "#9500ff" : "white",
            fontWeight: isActive ? "bold" : "normal"
          })}
        >
          Корзина <span className="cart-count">{cartCount}</span>
        </NavLink>
        <NavLink
          to="/login"
          style={({ isActive }) => ({
            color: isActive ? "#9500ff" : "white",
            fontWeight: isActive ? "bold" : "normal"
          })}
        >
          Вход
        </NavLink>
        <Switch theme={theme} toggleTheme={toggleTheme} />
      </nav>
    </div>
  )
}
export default Navi