import { useEffect } from "react";
import { listNotifications, markAllNotificationsRead } from "../mock/api";
import { useSession } from "../context/SessionContext";
import { EmptyState } from "../components/EmptyState";

const TYPE_LABELS: Record<string, string> = {
  booking_confirmed: "Подтверждение записи",
  reminder: "Напоминание",
  cancelled_by_studio: "Отменено мастерской",
  waitlist_spot_available: "Лист ожидания",
};

export function NotificationsPage() {
  const { clientId } = useSession();
  const notifications = listNotifications(clientId);

  // Открыл страницу — считаем все уведомления прочитанными (стандартное поведение inbox).
  useEffect(() => {
    markAllNotificationsRead(clientId);
  }, [clientId]);

  return (
    <div className="page">
      <h1>Уведомления</h1>

      {notifications.length === 0 ? (
        <EmptyState
          title="Уведомлений пока нет"
          description="Здесь появятся подтверждение записи, напоминания перед занятием и другие важные события."
          actionLabel="Посмотреть занятия"
          actionTo="/"
        />
      ) : (
        <ul className="notification-list">
          {notifications.map((n) => (
            <li key={n.id} className={`notification-card notification-card--${n.type}`}>
              <div className="notification-card__type">{TYPE_LABELS[n.type]}</div>
              <div>{n.message}</div>
              <div className="notification-card__time">
                {new Date(n.createdAt).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
