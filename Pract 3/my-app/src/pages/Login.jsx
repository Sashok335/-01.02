import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Проверка на клиенте — для удобства. Настоящая проверка всё равно
// остаётся на сервере: клиенту доверять нельзя.
function validate(values, isRegister) {
    const errors = {};

    if (isRegister && !values.fullName.trim()) errors.fullName = "Введите имя";

    if (!values.email.trim()) errors.email = "Введите email";
    else if (!EMAIL_RE.test(values.email.trim())) errors.email = "Это не похоже на email";

    if (!values.password) errors.password = "Введите пароль";
    else if (isRegister && values.password.length < 8) errors.password = "Пароль от 8 символов";

    return errors;
}

const EMPTY = { fullName: "", email: "", password: "" };

export default function Login() {
    const { login, register } = useContext(AuthContext);
    const navigate = useNavigate();

    // Один экран на два действия: переключатель вкладок, а не две страницы.
    const [mode, setMode] = useState("login");
    const isRegister = mode === "register";

    const [values, setValues] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    function switchMode(next) {
        setMode(next);
        setValues(EMPTY);        // чужие поля из другой вкладки не показываем
        setErrors({});
        setFormError(null);
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setValues((v) => ({ ...v, [name]: value }));
        // Стираем ошибку поля, как только его начали править.
        setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    async function handleSubmit(e) {
        e.preventDefault();           // без этого страница перезагрузится
        setFormError(null);

        const found = validate(values, isRegister);
        if (Object.keys(found).length) {
            setErrors(found);
            return;                     // на сервер не идём
        }

        setSubmitting(true);
        try {
            if (isRegister) {
                await register(values.fullName, values.email, values.password);
            } else {
                await login(values.email, values.password);
            }
            navigate("/dashboard");
        } catch (err) {
            setFormError(err.message);
            // Ошибки полей от сервера тоже показываем у полей.
            if (err.details) setErrors(err.details);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="form-page">
            <div className="tabs">
                <button
                    type="button"
                    className={`tab ${!isRegister ? "tab-active" : ""}`}
                    onClick={() => switchMode("login")}
                >
                    Вход
                </button>
                <button
                    type="button"
                    className={`tab ${isRegister ? "tab-active" : ""}`}
                    onClick={() => switchMode("register")}
                >
                    Регистрация
                </button>
            </div>

            <form className="shop-form" onSubmit={handleSubmit} noValidate>
                <h2>{isRegister ? "Создать аккаунт" : "Вход"}</h2>

                {isRegister && (
                    <label>
                        Имя
                        <input
                            type="text"
                            name="fullName"
                            value={values.fullName}
                            onChange={handleChange}
                            className={errors.fullName ? "invalid" : ""}
                            placeholder="Как к тебе обращаться"
                        />
                        {errors.fullName && <span className="error">{errors.fullName}</span>}
                    </label>
                )}

                <label>
                    Email
                    <input
                        type="email"
                        name="email"
                        value={values.email}
                        onChange={handleChange}
                        className={errors.email ? "invalid" : ""}
                        autoComplete="email"
                    />
                    {errors.email && <span className="error">{errors.email}</span>}
                </label>

                <label>
                    Пароль
                    <input
                        type="password"
                        name="password"
                        value={values.password}
                        onChange={handleChange}
                        className={errors.password ? "invalid" : ""}
                        autoComplete={isRegister ? "new-password" : "current-password"}
                    />
                    {errors.password && <span className="error">{errors.password}</span>}
                </label>

                {formError && <p className="error">{formError}</p>}

                <button className="beautiful-button" type="submit" disabled={submitting}>
                    {submitting ? "Отправляем…" : isRegister ? "Зарегистрироваться" : "Войти"}
                </button>

                {!isRegister && (
                    <p className="muted">
                        Тестовые входы: buyer1@shop.ru / password123, admin@shop.ru / admin123
                    </p>
                )}
            </form>
        </div>
    );
}