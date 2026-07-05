import { useState } from "react";
import { createReview } from "../mock/api";
import { ApiException } from "../types";

interface Props {
  bookingId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ReviewModal({ bookingId, onClose, onSubmitted }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleSubmit() {
    if (rating < 1) {
      setErrorMsg("Поставьте рейтинг от 1 до 5, чтобы отправить оценку.");
      return;
    }
    try {
      createReview(bookingId, rating, comment || undefined);
      onSubmitted();
    } catch (e) {
      setErrorMsg(e instanceof ApiException ? e.payload.message : "Ошибка");
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Оценить мастера</h2>

        <div className="star-row">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`star ${n <= rating ? "star--filled" : ""}`}
              onClick={() => setRating(n)}
              aria-label={`${n} звёзд`}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          placeholder="Комментарий (необязательно)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {errorMsg && <div className="banner banner--error">{errorMsg}</div>}

        <div className="modal__actions">
          <button className="link-button" onClick={onClose}>
            Отмена
          </button>
          <button onClick={handleSubmit}>Отправить</button>
        </div>
      </div>
    </div>
  );
}
