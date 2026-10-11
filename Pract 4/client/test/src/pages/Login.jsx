import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { forgotPassword, resetPassword } from "../api/auth";
import { errorText } from "../api/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(\+7|8)[\s\-()]*\d{3}[\s\-()]*\d{3}[\s\-()]*\d{2}[\s\-()]*\d{2}$/;
const NAME_RE = /^[А-Яа-яЁёA-Za-z][А-Яа-яЁёA-Za-z' -]{1,149}$/;

function validate(values, isRegister) {
    const errors = {};

    if (isRegister) {
        if (!values.fullName.trim()) errors.fullName = "Введите имя";
        else if (!NAME_RE.test(values.fullName.trim())) {
            errors.fullName = "Имя — только буквы, пробел и дефис";
        }

        if (!values.phone.trim()) errors.phone = "Введите телефон";
        else if (!PHONE_RE.test(values.phone.trim())) {
            errors.phone = "Телефон в формате +7 (999) 123-45-67";
        }
    }

    if (!values.email.trim()) errors.email = "Введите email";
    else if (!EMAIL_RE.test(values.email.trim())) errors.email = "Это не похоже на email";

    if (!values.password) errors.password = "Введите пароль";
    else if (isRegister && values.password.length < 8) errors.password = "Пароль от 8 символов";

    return errors;
}

const EMPTY = { fullName: "", email: "", phone: "", password: "" };

export default function Login() {
    const { login, register } = useContext(AuthContext);
    const navigate = useNavigate();

    const [mode, setMode] = useState("login"); // login | register | forgot
    const isRegister = mode === "register";

    const [values, setValues] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Восстановление пароля.
    const [step, setStep] = useState("request"); // request | reset | done
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [resetMessage, setResetMessage] = useState(null);

    function switchMode(next) {
        setMode(next);
        setValues(EMPTY);
        setErrors({});
        setFormError(null);
        setStep("request");
        setCode("");
        setNewPassword("");
        setResetMessage(null);
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setValues((v) => ({ ...v, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setFormError(null);

        const found = validate(values, isRegister);
        if (Object.keys(found).length) {
            setErrors(found);
            return;
        }

        setSubmitting(true);
        try {
            if (isRegister) {
                await register(values.fullName, values.email, values.password, values.phone);
            } else {
                await login(values.email, values.password);
            }
            navigate("/dashboard");
        } catch (err) {
            setFormError(errorText(err, "Не удалось войти. Попробуйте ещё раз"));
            if (err.details) setErrors(err.details);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleRequestCode(e) {
        e.preventDefault();
        setFormError(null);
        if (!EMAIL_RE.test(values.email.trim())) {
            setErrors({ email: "Это не похоже на email" });
            return;
        }
        setSubmitting(true);
        try {
            const result = await forgotPassword(values.email);
            setResetMessage(result.message);
            setStep("reset");
        } catch (err) {
            setFormError(errorText(err, "Не удалось отправить код"));
            if (err.details) setErrors(err.details);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleReset(e) {
        e.preventDefault();
        setFormError(null);
        const details = {};
        if (!/^\d{6}$/.test(code.trim())) details.code = "Код — это 6 цифр из письма";
        if (newPassword.length < 8) details.newPassword = "Новый пароль от 8 символов";
        if (Object.keys(details).length) {
            setErrors(details);
            return;
        }
        setSubmitting(true);
        try {
            await resetPassword({ email: values.email, code, newPassword });
            setStep("done");
        } catch (err) {
            setFormError(errorText(err, "Не удалось сменить пароль"));
            if (err.details) setErrors(err.details);
        } finally {
            setSubmitting(false);
        }
    }

    if (mode === "forgot") {
        return (
            <div className="form-page">
                <form
                    className="shop-form"
                    onSubmit={step === "request" ? handleRequestCode : handleReset}
                    noValidate
                >
                    <h2>Восстановление пароля</h2>

                    {step === "done" ? (
                        <>
                            <p className="ok-text">
                                Пароль изменён. Теперь войдите с новым паролем.
                            </p>
                            <button className="beautiful-button" type="button" onClick={() => switchMode("login")}>
                                Вернуться ко входу
                            </button>
                        </>
                    ) : (
                        <>
                            {resetMessage && step === "reset" && <p className="ok-text">{resetMessage}</p>}

                            <label>
                                Email
                                <input
                                    type="email"
                                    name="email"
                                    value={values.email}
                                    onChange={handleChange}
                                    readOnly={step === "reset"}
                                    className={errors.email ? "invalid" : ""}
                                />
                                {errors.email && <span className="error">{errors.email}</span>}
                            </label>

                            {step === "reset" && (
                                <>
                                    <label>
                                        Код из письма
                                        <input
                                            inputMode="numeric"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                            placeholder="123456"
                                            className={errors.code ? "invalid" : ""}
                                        />
                                        {errors.code && <span className="error">{errors.code}</span>}
                                    </label>

                                    <label>
                                        Новый пароль
                                        <input
                                            type="password"
                                            autoComplete="new-password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className={errors.newPassword ? "invalid" : ""}
                                        />
                                        {errors.newPassword && <span className="error">{errors.newPassword}</span>}
                                    </label>
                                </>
                            )}

                            {formError && <p className="error">{formError}</p>}

                            <button className="beautiful-button" type="submit" disabled={submitting}>
                                {submitting
                                    ? "Отправляем…"
                                    : step === "request" ? "Получить код" : "Сменить пароль"}
                            </button>

                            <button className="link-button" type="button" onClick={() => switchMode("login")}>
                                Я вспомнил пароль
                            </button>
                        </>
                    )}
                </form>
            </div>
        );
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
                    <>
                        <label>
                            Имя
                            <input
                                type="text"
                                name="fullName"
                                value={values.fullName}
                                onChange={handleChange}
                                className={errors.fullName ? "invalid" : ""}
                                placeholder="Иван Петров"
                            />
                            {errors.fullName && <span className="error">{errors.fullName}</span>}
                        </label>

                        <label>
                            Телефон
                            <input
                                type="tel"
                                name="phone"
                                value={values.phone}
                                onChange={handleChange}
                                className={errors.phone ? "invalid" : ""}
                                placeholder="+7 (999) 123-45-67"
                            />
                            {errors.phone && <span className="error">{errors.phone}</span>}
                        </label>
                    </>
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
                    <button className="link-button" type="button" onClick={() => switchMode("forgot")}>
                        Забыли пароль?
                    </button>
                )}

                {!isRegister && (
                    <p className="muted">
                        Тестовые входы: buyer1@shop.ru / password123, admin@shop.ru / admin123
                    </p>
                )}
            </form>
        </div>
    );
}
