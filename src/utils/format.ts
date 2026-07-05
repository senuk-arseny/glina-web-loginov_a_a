// Утилиты работы с датами, вынесены отдельно, т.к. используются на нескольких страницах.

// <input type="date"> отдаёт "YYYY-MM-DD". new Date(строка) парсит это как UTC-полночь,
// что сдвигает границу в зависимости от часового пояса браузера — поэтому парсим вручную
// и всегда получаем именно локальную полночь / локальный конец дня.
export function parseDateInputStart(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function parseDateInputEnd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

// Единый формат даты/времени без секунд — используем везде, чтобы не расходилось по страницам.
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTimeWithWeekday(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
