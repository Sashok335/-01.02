import { useNavigate } from "react-router-dom";

export default function Login() {
    const navigate = useNavigate();

    function handleLogin() {
        const isAuth = true;

        if (isAuth) {
            navigate("/dashboard");
        } else {
            alert("Ошибка авторизации");
        }
    }

    return (
        <div style={{ textAlign: "center", marginTop: "120px" }}>
            <h2>Страница входа</h2>
            <button className="beautiful-button" onClick={handleLogin}>
                Войти
            </button>
        </div>
    );
}