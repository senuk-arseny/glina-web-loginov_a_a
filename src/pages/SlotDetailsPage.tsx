import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSlotDetails, createBooking, joinWaitlist, hasActiveBooking } from "../mock/api";
import { useSession } from "../context/SessionContext";
import { ApiException } from "../types";
import { formatDateTime } from "../utils/format";

export function SlotDetailsPage() {
  const { slotId } = useParams<{ slotId: string }>();
  const { clientId } = useSession();
  const navigate = useNavigate();

  const [wantsRental, setWantsRental] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!slotId) return null;
  const slot = getSlotDetails(slotId);

  const isFull = slot.freeSpots <= 0;
  const isCancelled = slot.status === "cancelled_by_studio";
  const rentalAvailable = slot.equipmentRental.availableSets > 0;
  const alreadyBooked = hasActiveBooking(clientId, slotId);

  function handleBook() {
    setBusy(true);
    setErrorMsg(null);
    try {
      createBooking(clientId, slotId!, wantsRental);
      setSuccessMsg("Запись подтверждена! Уведомление отправлено вам на почту.");
    } catch (e) {
      if (e instanceof ApiException) {
        if (e.payload.error === "no_free_spots") {
          setErrorMsg("Мест больше нет — кто-то успел записаться раньше вас.");
        } else if (e.payload.error === "already_booked") {
          setErrorMsg("Вы уже записаны на это занятие — посмотрите «Мои записи».");
        } else {
          setErrorMsg(e.payload.message);
        }
      } else {
        setErrorMsg("Не удалось выполнить запись, попробуйте ещё раз.");
      }
    } finally {
      setBusy(false);
    }
  }

  function handleJoinWaitlist() {
    setBusy(true);
    setErrorMsg(null);
    try {
      joinWaitlist(clientId, slotId!);
      setSuccessMsg("Вы в листе ожидания. Мы уведомим вас, если место освободится.");
    } catch (e) {
      setErrorMsg(e instanceof ApiException ? e.payload.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <button className="link-button" onClick={() => navigate(-1)}>
        ← Назад к расписанию
      </button>

      <h1>{slot.programName}</h1>
      <p className="muted">{slot.programDescription}</p>

      <dl className="details-grid">
        <dt>Мастер</dt>
        <dd>
          {slot.masterName} — рейтинг {slot.masterAvgRating} ★ ({slot.masterReviewsCount} отзывов)
        </dd>
        <dt>Время</dt>
        <dd>{formatDateTime(slot.startTime)}</dd>
        <dt>Длительность</dt>
        <dd>{slot.durationMinutes} минут</dd>
        <dt>Свободные места</dt>
        <dd>{isCancelled ? "—" : slot.freeSpots}</dd>
      </dl>

      {isCancelled ? (
        <div className="banner banner--cancelled">
          Занятие отменено мастерской. Причина: {slot.cancellationReason}.
          Повторная запись на этот слот недоступна.
        </div>
      ) : alreadyBooked ? (
        <div className="banner banner--success">
          Вы уже записаны на это занятие — посмотрите «Мои записи».
        </div>
      ) : (
        <div className="booking-box">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={wantsRental}
              disabled={!rentalAvailable}
              onChange={(e) => setWantsRental(e.target.checked)}
            />
            Взять инструменты и фартук напрокат ({slot.equipmentRental.pricePerSet} ₽)
            {!rentalAvailable && " — комплекты закончились"}
          </label>

          {errorMsg && <div className="banner banner--error">{errorMsg}</div>}
          {successMsg && <div className="banner banner--success">{successMsg}</div>}

          {!successMsg &&
            (isFull ? (
              <button disabled={busy} onClick={handleJoinWaitlist}>
                Встать в лист ожидания
              </button>
            ) : (
              <button disabled={busy} onClick={handleBook}>
                Записаться
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
