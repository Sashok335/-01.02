import { NavLink } from 'react-router-dom';
import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import { CartContext } from '../contexts/CartContext';
import { AuthContext } from '../contexts/AuthContext';
import Switch from './Switcher';

function Navi() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { cartCount } = useContext(CartContext);
  const { user, logout } = useContext(AuthContext);
  const firstName = user?.fullName?.trim().split(/\s+/)[0];

  return (
    <header className="nav-bar">
      <nav className="site-nav" aria-label="Основная навигация">
        <NavLink to="/" className="nav-brand" aria-label="На главную">
          <span className="nav-brand-mark" aria-hidden="true">C</span>
          <span>CYBER<span className="nav-brand-accent">SHOP</span></span>
        </NavLink>

        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Каталог
          </NavLink>
          <NavLink to="/cart" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Корзина <span className="cart-count">{cartCount}</span>
          </NavLink>
        </div>

        <div className="nav-actions">
          {user ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `nav-account${isActive ? " active" : ""}`}
                aria-label={`Профиль: ${user.fullName}`}
              >
                <span className="nav-avatar" aria-hidden="true">
                  {user.fullName.trim().charAt(0).toUpperCase()}
                </span>
                <span className="nav-account-name">{firstName || "Профиль"}</span>
              </NavLink>
              <button className="nav-logout" type="button" onClick={logout}>
                Выйти
              </button>
            </>
          ) : (
            <NavLink to="/login" className={({ isActive }) => `nav-login${isActive ? " active" : ""}`}>
              Войти
            </NavLink>
          )}
          <span className="nav-divider" aria-hidden="true" />
          <div className="nav-theme" title={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}>
            <Switch theme={theme} toggleTheme={toggleTheme} />
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navi;
