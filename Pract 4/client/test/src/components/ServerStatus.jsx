import { useEffect, useState } from "react";

// Показывает страницу «ведутся технические работы», когда backend недоступен.
// События api-down/api-up присылает api/client.js.
export default function ServerStatus() {
    const [down, setDown] = useState(false);

    useEffect(() => {
        const onDown = () => setDown(true);
        const onUp = () => setDown(false);

        window.addEventListener("api-down", onDown);
        window.addEventListener("api-up", onUp);

        return () => {
            window.removeEventListener("api-down", onDown);
            window.removeEventListener("api-up", onUp);
        };
    }, []);

    if (!down) return null;

    return (
        <div className="server-down" role="alert">
            <div className="server-down-card">
                <span className="server-down-icon" aria-hidden="true">🛠️</span>
                <h2>Ведутся технические работы</h2>
                <p>Сервер временно недоступен. Пожалуйста, зайдите чуть позже.</p>
                <button className="beautiful-button" type="button" onClick={() => window.location.reload()}>
                    Повторить
                </button>
            </div>
        </div>
    );
}
