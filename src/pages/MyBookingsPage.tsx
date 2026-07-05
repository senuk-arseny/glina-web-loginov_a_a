import { useState } from "react";
import {
  listBookings,
  cancelBooking,
  markBookingCompleted,
  listWaitlistForClient,
  simulateStudioCancellation,
} from "../mock/api";
import { useSession } from "../context/SessionContext";
import { ReviewModal } from "../components/ReviewModal";
import { EmptyState } from "../components/EmptyState";
import { formatDateTime } from "../utils/format";

const STATUS_LABELS: Record<string, string> = {
  active: "Активна",
  cancelled_by_client: "Отменена вами",
  cancelled_by_studio: "Отменено мастерской",
  completed: "Завершено",
};

export function MyBookingsPage() {
  const { clientId } = useSession();
  const [, forceRerender] = useState(0);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [lateWarning, setLateWarning] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const bookings = listBookings(clientId);
  const waitlistEntries = listWaitlistForClient(clientId).filter(
    (w) => w.status === "waiting" || w.status === "notified"
  );
  const nothingAtAll = bookings.length === 0 && waitlistEntries.length === 0;

  function handleCancel(bookingId: string) {
    const result = cancelBooking(bookingId);
    if (result.wasLate) {
      setLateWarning(
        "Отмена зафиксирована как поздняя (менее чем за 2 часа до начала). Это не блокирует отмену, но сохраняется в вашей истории."
      );
    } else {
      setLateWarning(null);
    }
    forceRerender((n) => n + 1);
  }

  // Демо-кнопка: в реальной системе переход в "completed" происходит по времени на бэкенде.
  function handleSimulateCompletion(bookingId: string) {
    markBookingCompleted(bookingId);
    forceRerender((n) => n + 1);
  }

  // Демо-кнопка: показывает FR-11/FR-14 — как выглядит реакция клиента на форс-мажорную
  // отмену занятия мастерской. В реальной системе саму отмену инициирует владелец/админ.
  function handleSimulateForceMajeure(slotId: string) {
    simulateStudioCancellation(slotId, "Сломалась печь (демо-отмена)");
    forceRerender((n) => n + 1);
  }

  return (
    <div className="page">
      <h1>Мои записи</h1>

      {lateWarning && <div className="banner banner--warning">{lateWarning}</div>}
      {reviewSuccess && (
        <div className="banner banner--success">
          Спасибо! Ваш отзыв отправлен и учтён в рейтинге мастера.
        </div>
      )}

      {nothingAtAll ? (
        <EmptyState
          title="Записей пока нет"
          description="Загляните в расписание и выберите время, которое вам подходит — записаться можно в пару кликов."
          actionLabel="Посмотреть занятия"
          actionTo="/"
        />
      ) : bookings.length === 0 ? (
        <p className="muted">
          Активных записей нет, но вы стоите в листе ожидания — смотрите ниже.
        </p>
      ) : (
        <ul className="booking-list">
          {bookings.map((b) => (
            <li key={b.id} className="booking-card">
              <div>
                <strong>{b.slot.programName}</strong>
                <div className="muted">
                  {formatDateTime(b.slot.startTime)} ·{" "}
                  {b.slot.masterName}
                </div>
                {b.slot.status === "cancelled_by_studio" && (
                  <div className="banner banner--cancelled">
                    Отменено мастерской: {b.slot.cancellationReason}
                  </div>
                )}
              </div>

              <div className="booking-card__actions">
                <span className={`badge badge--status-${b.status}`}>
                  {STATUS_LABELS[b.status]}
                  {b.wasLateCancellation && " (поздняя)"}
                </span>

                {b.status === "active" && (
                  <button onClick={() => handleCancel(b.id)}>Отменить</button>
                )}

                {/* Демо-хелперы, чтобы протестировать сценарии без ожидания реального времени/бэкенда */}
                {b.status === "active" && (
                  <>
                    <button
                      className="link-button"
                      onClick={() => handleSimulateCompletion(b.id)}
                    >
                      (демо) отметить завершённым
                    </button>
                    <button
                      className="link-button"
                      onClick={() => handleSimulateForceMajeure(b.slotId)}
                    >
                      (демо) форс-мажор мастерской
                    </button>
                  </>
                )}

                {b.status === "completed" && (
                  <button
                    onClick={() => {
                      setReviewSuccess(false);
                      setReviewFor(b.id);
                    }}
                  >
                    Оценить мастера
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {reviewFor && (
        <ReviewModal
          bookingId={reviewFor}
          onClose={() => setReviewFor(null)}
          onSubmitted={() => {
            setReviewFor(null);
            setReviewSuccess(true);
            forceRerender((n) => n + 1);
          }}
        />
      )}

      {waitlistEntries.length > 0 && (
        <>
          <h2>Лист ожидания</h2>
          <ul className="booking-list">
            {waitlistEntries.map((w) => (
              <li key={w.id} className="booking-card">
                <div>
                  <strong>{w.slot.programName}</strong>
                  <div className="muted">
                    {formatDateTime(w.slot.startTime)} · {w.slot.masterName}
                  </div>
                </div>
                <div className="booking-card__actions">
                  {w.status === "notified" ? (
                    <span className="badge badge--regular">
                      Место освободилось — успейте записаться!
                    </span>
                  ) : (
                    <span className="badge">Ваша позиция в очереди: {w.position}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
