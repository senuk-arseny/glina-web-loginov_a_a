import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listSlots } from "../mock/api";
import {
  parseDateInputStart,
  parseDateInputEnd,
  formatDateTimeWithWeekday,
} from "../utils/format";

export function SlotListPage() {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const slots = useMemo(() => {
    const from = dateFrom ? parseDateInputStart(dateFrom) : undefined;
    const to = dateTo ? parseDateInputEnd(dateTo) : undefined;
    return listSlots(from, to);
  }, [dateFrom, dateTo]);

  return (
    <div className="page">
      <h1>Расписание занятий</h1>

      <div className="filters">
        <label>
          С
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label>
          По
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            className="link-button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
          >
            Сбросить (показать ближайшие 7 дней)
          </button>
        )}
      </div>

      {slots.length === 0 ? (
        <div className="empty-state">
          Пока нет доступных занятий на выбранный период.
        </div>
      ) : (
        <ul className="slot-list">
          {slots.map((slot) => (
            <li key={slot.id}>
              <Link
                to={`/slots/${slot.id}`}
                className={`slot-card ${
                  slot.status === "cancelled_by_studio"
                    ? "slot-card--cancelled"
                    : ""
                }`}
              >
                <div className="slot-card__main">
                  <strong>{slot.programName}</strong>
                  <span>{formatDateTimeWithWeekday(slot.startTime)}</span>
                </div>
                <div className="slot-card__meta">
                  <span>
                    {slot.masterName} ★ {slot.masterAvgRating} ({slot.masterReviewsCount})
                  </span>
                  {slot.status === "cancelled_by_studio" ? (
                    <span className="badge badge--cancelled">
                      Отменено мастерской
                    </span>
                  ) : (
                    <span
                      className={slot.freeSpots === 0 ? "badge badge--full" : "badge"}
                    >
                      {slot.freeSpots === 0
                        ? "Мест нет"
                        : `Свободно: ${slot.freeSpots}`}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
