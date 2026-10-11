import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { getProductReviews, createReview } from "../api/reviews";
import { errorText } from "../api/client";

function Stars({ value }) {
    return (
        <span className="review-stars" aria-label={`Оценка ${value} из 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= value ? "star filled" : "star"}>★</span>
            ))}
        </span>
    );
}

export default function ReviewsModal({ product, onClose }) {
    const { user } = useContext(AuthContext);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [formError, setFormError] = useState(null);
    const [formOk, setFormOk] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    async function load() {
        setLoading(true);
        try {
            setReviews(await getProductReviews(product.productId));
            setError(null);
        } catch (e) {
            setError(errorText(e, "Не удалось загрузить отзывы"));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, [product.productId]);

    const myReview = user ? reviews.find((r) => r.userId === user.id && !r.isDeleted) : null;
    const canWrite = Boolean(user) && !myReview;

    async function handleSubmit(e) {
        e.preventDefault();
        setFormError(null);
        setFormOk(null);
        setSubmitting(true);
        try {
            await createReview(product.productId, { rating, comment });
            setComment("");
            setRating(5);
            setFormOk("Спасибо! Отзыв опубликован.");
            await load();
        } catch (err) {
            setFormError(errorText(err, "Не удалось отправить отзыв"));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                    <h3>Отзывы · {product.title}</h3>
                    <button className="modal-close" type="button" onClick={onClose} aria-label="Закрыть">✕</button>
                </div>

                {loading && <p className="muted">Загружаем отзывы…</p>}
                {error && <p className="error">{error}</p>}

                {!loading && !error && reviews.length === 0 && (
                    <p className="muted">Отзывов пока нет. Будьте первым!</p>
                )}

                <div className="review-list">
                    {reviews.map((r) => (
                        <div className="review" key={r.reviewId}>
                            <div className="review-head">
                                <b>{r.userName}</b>
                                <span className="muted">{r.createdAtFormatted}</span>
                            </div>
                            {r.isDeleted ? (
                                <p className="error">Отзыв удалён администрацией за нарушение политики.</p>
                            ) : (
                                <>
                                    <Stars value={r.rating} />
                                    <p>{r.comment}</p>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {canWrite && (
                    <form className="review-form" onSubmit={handleSubmit}>
                        <h4>Оставить отзыв</h4>
                        <div className="rating-picker">
                            {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                    type="button"
                                    key={n}
                                    className={n <= rating ? "star filled" : "star"}
                                    onClick={() => setRating(n)}
                                    aria-label={`Оценка ${n}`}
                                >★</button>
                            ))}
                        </div>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows="3"
                            maxLength="1000"
                            placeholder="Расскажите о доме"
                        />
                        {formError && <p className="error">{formError}</p>}
                        {formOk && <p className="ok-text">{formOk}</p>}
                        <button className="beautiful-button" type="submit" disabled={submitting}>
                            {submitting ? "Отправляем…" : "Отправить отзыв"}
                        </button>
                    </form>
                )}

                {!user && <p className="muted">Войдите, чтобы оставить отзыв.</p>}
                {user && myReview && <p className="muted">Вы уже оставляли отзыв на этот дом.</p>}
            </div>
        </div>
    );
}
