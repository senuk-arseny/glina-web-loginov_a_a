import type {
  Slot,
  Booking,
  WaitlistEntry,
  Review,
  ClientProfile,
  AppNotification,
  NotificationType,
} from "../types";
import { ApiException } from "../types";
import {
  programs,
  masters,
  slots as seedSlots,
  equipmentRentals,
  currentClient,
} from "./data";

// In-memory "база данных" мок-бэкенда. Мутируется напрямую — как и положено моку.
// ВАЖНО: это не настоящий бэкенд — нет ни сервера, ни базы данных, ни персистентности.
// Всё живёт в оперативной памяти вкладки браузера и полностью сбрасывается при перезагрузке
// страницы. Подробное объяснение — в сопроводительном сообщении.
const db = {
  slots: seedSlots.map((s) => ({ ...s })),
  bookings: [] as Booking[],
  waitlist: [] as WaitlistEntry[],
  reviews: [] as Review[],
  notifications: [] as AppNotification[],
  clients: {} as Record<string, ClientProfile>,
};

const LATE_CANCELLATION_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 часа — из брифа
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000; // напоминание генерируется, если до занятия меньше 24 часов
let idCounter = 100;
const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

function err(error: string, message: string): never {
  throw new ApiException({ error, message });
}

function findSlot(slotId: string): Slot {
  const slot = db.slots.find((s) => s.id === slotId);
  if (!slot) err("not_found", "Слот не найден");
  return slot;
}

// ---------- Вход без SMS: имя + телефон ----------
// Телефон — единственный идентификатор клиента. Нормализуем до цифр, чтобы
// "+7 900 000-00-00" и "79000000000" считались одним и тем же клиентом.
// Отдельно: российский номер часто пишут с ведущей "8" вместо "+7"
// ("89001234567" и "+79001234567" — один и тот же номер) — приводим к единому виду,
// иначе один человек получит два разных профиля в зависимости от того, как он ввёл номер.
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) {
    return "7" + digits.slice(1);
  }
  return digits;
}

export function loginOrRegister(name: string, phone: string): ClientProfile {
  const trimmedName = name.trim();
  const key = normalizePhone(phone);
  if (!trimmedName) err("invalid_name", "Введите имя");
  if (key.length < 10) err("invalid_phone", "Введите корректный номер телефона");

  const existing = db.clients[key];
  if (existing) {
    existing.name = trimmedName; // человек мог представиться иначе — обновляем
    return { ...existing };
  }

  const client: ClientProfile = {
    id: key,
    name: trimmedName,
    contact: phone.trim(),
    isRegular: false,
    visitedCount: 0,
    lateCancellationCount: 0,
  };
  db.clients[key] = client;
  return { ...client };
}

// ---------- Вместимость слота — вычисляется, а не хранится ----------
// Раньше freeSpots было отдельным полем, которое приходилось вручную инкрементить/декрементить
// в каждом месте, где меняются брони. Это создавало риск рассинхрона (ровно то, о чём был
// гипотетический Bug-03 в bugs.md). Теперь freeSpots — это всегда производная величина:
// лимит программы минус число активных броней. Рассинхрон физически невозможен.
function activeBookingsCount(slotId: string): number {
  return db.bookings.filter((b) => b.slotId === slotId && b.status === "active")
    .length;
}

function computeFreeSpots(slot: Slot): number {
  const program = programs.find((p) => p.id === slot.programId)!;
  return Math.max(0, program.maxParticipants - activeBookingsCount(slot.id));
}

// ---------- Уведомления (FR-12, FR-13, FR-14) ----------
function pushNotification(
  clientId: string,
  type: NotificationType,
  message: string,
  extra?: { relatedSlotId?: string; relatedBookingId?: string }
) {
  db.notifications.push({
    id: nextId("notif"),
    clientId,
    type,
    message,
    createdAt: new Date().toISOString(),
    read: false,
    ...extra,
  });
}

// В реальной системе напоминание отправляет крон-джоб на бэкенде в нужный момент времени.
// У нас нет фонового планировщика, поэтому мы "досчитываем" напоминания в момент, когда
// клиент открывает список уведомлений — как будто это разовая проверка "не пора ли напомнить".
// Если у активной брони до начала занятия осталось меньше 24 часов и напоминание по этой
// брони ещё не отправлялось — создаём его.
function generateDueReminders(clientId: string) {
  const activeBookings = db.bookings.filter(
    (b) => b.clientId === clientId && b.status === "active"
  );
  for (const booking of activeBookings) {
    const slot = db.slots.find((s) => s.id === booking.slotId);
    if (!slot) continue;
    const msUntilStart = new Date(slot.startTime).getTime() - Date.now();
    if (msUntilStart <= 0 || msUntilStart > REMINDER_WINDOW_MS) continue;

    const alreadySent = db.notifications.some(
      (n) => n.type === "reminder" && n.relatedBookingId === booking.id
    );
    if (alreadySent) continue;

    const program = programs.find((p) => p.id === slot.programId)!;
    pushNotification(
      clientId,
      "reminder",
      `Напоминаем: скоро у вас занятие «${program.name}» в ${new Date(
        slot.startTime
      ).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit" })}.`,
      { relatedSlotId: slot.id, relatedBookingId: booking.id }
    );
  }
}

export function listNotifications(clientId: string) {
  generateDueReminders(clientId);
  return db.notifications
    .filter((n) => n.clientId === clientId)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function countUnreadNotifications(clientId: string): number {
  generateDueReminders(clientId);
  return db.notifications.filter((n) => n.clientId === clientId && !n.read).length;
}

export function markAllNotificationsRead(clientId: string) {
  db.notifications
    .filter((n) => n.clientId === clientId)
    .forEach((n) => (n.read = true));
}

// ---------- Публичные функции мок-API (имена/сигнатуры повторяют openapi.yaml) ----------

export function listSlots(dateFrom?: Date, dateTo?: Date) {
  const from = dateFrom ?? new Date();
  const to = dateTo ?? new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
  return db.slots
    .filter((s) => {
      const t = new Date(s.startTime).getTime();
      return t >= from.getTime() && t <= to.getTime();
    })
    .map(enrichSlot)
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
}

function enrichSlot(slot: Slot) {
  const program = programs.find((p) => p.id === slot.programId)!;
  const master = masters.find((m) => m.id === slot.masterId)!;
  return {
    ...slot,
    programName: program.name,
    masterName: master.name,
    masterAvgRating: master.avgRating,
    masterReviewsCount: master.reviewsCount,
    freeSpots: computeFreeSpots(slot),
  };
}

export function getSlotDetails(slotId: string) {
  const slot = findSlot(slotId);
  const program = programs.find((p) => p.id === slot.programId)!;
  const rental = equipmentRentals.find((r) => r.slotId === slotId);
  return {
    ...enrichSlot(slot),
    programDescription: program.description,
    equipmentRental: rental
      ? { availableSets: rental.availableSets, pricePerSet: rental.pricePerSet }
      : { availableSets: 0, pricePerSet: 0 },
  };
}

export function createBooking(
  clientId: string,
  slotId: string,
  equipmentRentalRequested: boolean
): Booking {
  const slot = findSlot(slotId);

  if (slot.status === "cancelled_by_studio") {
    err("slot_cancelled", "Занятие отменено мастерской, запись недоступна");
  }

  const alreadyBooked = db.bookings.some(
    (b) => b.clientId === clientId && b.slotId === slotId && b.status === "active"
  );
  if (alreadyBooked) {
    err("already_booked", "Вы уже записаны на это занятие");
  }

  // Пересчитываем свободные места именно сейчас, а не читаем потенциально устаревшее
  // значение — это гарантирует, что лимит программы (TC-09) физически нельзя превысить.
  if (computeFreeSpots(slot) <= 0) {
    err("no_free_spots", "Мест больше нет");
  }

  if (equipmentRentalRequested) {
    const rental = equipmentRentals.find((r) => r.slotId === slotId);
    if (!rental || rental.availableSets <= 0) {
      err("no_equipment", "Комплекты для проката закончились");
    }
    rental.availableSets -= 1;
  }

  const booking: Booking = {
    id: nextId("booking"),
    slotId,
    clientId,
    equipmentRentalRequested,
    status: "active",
    wasLateCancellation: null,
    createdAt: new Date().toISOString(),
  };
  db.bookings.push(booking);

  const program = programs.find((p) => p.id === slot.programId)!;
  pushNotification(
    clientId,
    "booking_confirmed",
    `Запись подтверждена: «${program.name}» ${new Date(slot.startTime).toLocaleString(
      "ru-RU",
      { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }
    )}.`,
    { relatedSlotId: slot.id, relatedBookingId: booking.id }
  );

  return booking;
}

export function hasActiveBooking(clientId: string, slotId: string): boolean {
  return db.bookings.some(
    (b) => b.clientId === clientId && b.slotId === slotId && b.status === "active"
  );
}

export function listBookings(clientId: string, status?: string) {
  return db.bookings
    .filter((b) => b.clientId === clientId)
    .filter((b) => (status ? b.status === status : true))
    .map((b) => ({ ...b, slot: enrichSlot(findSlot(b.slotId)) }));
}

export function cancelBooking(bookingId: string): {
  status: Booking["status"];
  wasLate: boolean;
} {
  const booking = db.bookings.find((b) => b.id === bookingId);
  if (!booking) err("not_found", "Бронь не найдена");
  if (booking.status !== "active") {
    err("already_finalized", "Бронь уже отменена или завершена");
  }

  const slot = findSlot(booking.slotId);
  const msUntilStart = new Date(slot.startTime).getTime() - Date.now();
  const wasLate = msUntilStart < LATE_CANCELLATION_WINDOW_MS;

  booking.status = "cancelled_by_client";
  booking.wasLateCancellation = wasLate;

  // Баг, найденный в этом проходе: при отмене брони с прокатом комплект инструментов
  // не возвращался в доступный фонд — фонд проката медленно "утекал" с каждой отменённой
  // бронью. Раньше freeSpots инкрементился вручную здесь же, а про rental забыли.
  // Теперь freeSpots не хранится (см. computeFreeSpots), а прокат — восстанавливаем явно.
  if (booking.equipmentRentalRequested) {
    const rental = equipmentRentals.find((r) => r.slotId === slot.id);
    if (rental) rental.availableSets += 1;
  }

  if (wasLate) {
    const client = db.clients[booking.clientId];
    if (client) client.lateCancellationCount += 1;
  }

  // Продвижение листа ожидания — атомарно, в том же обработчике, что и отмена.
  advanceWaitlist(slot.id);

  return { status: booking.status, wasLate };
}

function advanceWaitlist(slotId: string) {
  const nextInLine = db.waitlist
    .filter((w) => w.slotId === slotId && w.status === "waiting")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];
  if (nextInLine) {
    nextInLine.status = "notified"; // обновляем статус сразу, до "отправки" уведомления
    const slot = findSlot(slotId);
    const program = programs.find((p) => p.id === slot.programId)!;
    pushNotification(
      nextInLine.clientId,
      "waitlist_spot_available",
      `Освободилось место на «${program.name}» (${new Date(
        slot.startTime
      ).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })}). Успейте записаться!`,
      { relatedSlotId: slotId }
    );
  }
}

export function joinWaitlist(clientId: string, slotId: string): WaitlistEntry {
  const slot = findSlot(slotId);
  if (slot.status === "cancelled_by_studio") {
    err(
      "slot_cancelled",
      "Занятие отменено мастерской, запись в лист ожидания недоступна"
    );
  }
  if (computeFreeSpots(slot) > 0) {
    err(
      "free_spots_available",
      "В слоте есть свободные места, используйте обычную запись"
    );
  }
  const entry: WaitlistEntry = {
    id: nextId("wait"),
    slotId,
    clientId,
    status: "waiting",
    createdAt: new Date().toISOString(),
  };
  db.waitlist.push(entry);
  return entry;
}

// position — всегда вычисляется на лету, не хранится (см. правку data-model.md)
export function getWaitlistPosition(entryId: string): number | null {
  const entry = db.waitlist.find((w) => w.id === entryId);
  if (!entry || entry.status !== "waiting") return null;
  const waitingForSlot = db.waitlist
    .filter((w) => w.slotId === entry.slotId && w.status === "waiting")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  return waitingForSlot.findIndex((w) => w.id === entry.id) + 1;
}

export function listWaitlistForClient(clientId: string) {
  return db.waitlist
    .filter((w) => w.clientId === clientId)
    .map((w) => ({
      ...w,
      position: getWaitlistPosition(w.id),
      slot: enrichSlot(findSlot(w.slotId)),
    }));
}

export function createReview(
  bookingId: string,
  rating: number,
  comment?: string
): Review {
  const booking = db.bookings.find((b) => b.id === bookingId);
  if (!booking) err("not_found", "Бронь не найдена");
  if (booking.status !== "completed") {
    err("not_completed", "Оценка доступна только для завершённых занятий");
  }
  const existing = db.reviews.find((r) => r.bookingId === bookingId);
  if (existing) {
    err("already_reviewed", "Отзыв по этой брони уже существует");
  }
  if (rating < 1 || rating > 5) {
    err("invalid_rating", "Рейтинг должен быть от 1 до 5");
  }

  const slot = findSlot(booking.slotId);
  const review: Review = {
    id: nextId("review"),
    bookingId,
    masterId: slot.masterId,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };
  db.reviews.push(review);

  const master = masters.find((m) => m.id === slot.masterId)!;
  const totalScore = master.avgRating * master.reviewsCount + rating;
  master.reviewsCount += 1;
  master.avgRating = Math.round((totalScore / master.reviewsCount) * 100) / 100;

  return review;
}

export function getClientProfile(clientId: string): ClientProfile {
  const client = db.clients[clientId];
  if (!client) err("not_found", "Клиент не найден");
  return { ...client };
}

// Демо-хелпер: пометить бронь завершённой (в реальном бэкенде это делает крон/переход времени).
export function markBookingCompleted(bookingId: string) {
  const booking = db.bookings.find((b) => b.id === bookingId);
  if (booking && booking.status === "active") {
    booking.status = "completed";
    const client = db.clients[booking.clientId];
    if (client) {
      client.visitedCount += 1;
      client.isRegular = client.visitedCount >= 3;
    }
  }
}

// Демо-хелпер: искусственно вызвать форс-мажорную отмену занятия мастерской (R-008).
// В реальной системе это действие выполняется в существующей инфраструктуре (вне скоупа
// клиентского приложения) — мы лишь показываем, как клиент должен отреагировать на результат.
export function simulateStudioCancellation(slotId: string, reason: string) {
  const slot = findSlot(slotId);
  slot.status = "cancelled_by_studio";
  slot.cancellationReason = reason;

  const affectedBookings = db.bookings.filter(
    (b) => b.slotId === slotId && b.status === "active"
  );
  const program = programs.find((p) => p.id === slot.programId)!;
  for (const booking of affectedBookings) {
    booking.status = "cancelled_by_studio";
    pushNotification(
      booking.clientId,
      "cancelled_by_studio",
      `Занятие «${program.name}» отменено мастерской. Причина: ${reason}.`,
      { relatedSlotId: slotId, relatedBookingId: booking.id }
    );
  }

  // Повторная запись на отменённый слот запрещена — ждущие в очереди тоже не смогут им
  // воспользоваться, поэтому лист ожидания на этот слот теряет смысл.
  db.waitlist
    .filter((w) => w.slotId === slotId && w.status === "waiting")
    .forEach((w) => (w.status = "expired"));
}

// Инициализация "фейковых" броней других (не текущего) клиентов — только чтобы часть слотов
// в демо выглядела частично или полностью занятой. Эти брони не показываются нигде в UI,
// так как все выборки идут по clientId текущего клиента.
function seedPhantomBookings() {
  const seedPlan: Record<string, number> = {
    "slot-2": 9, // круг, максимум 10 — оставляем 1 свободное место
    "slot-3": 6, // новички, максимум 6 — заполняем полностью
    "slot-6": 6, // круг, максимум 10 — оставляем 4 места
  };
  Object.entries(seedPlan).forEach(([slotId, count]) => {
    for (let i = 0; i < count; i++) {
      db.bookings.push({
        id: nextId("seed-booking"),
        slotId,
        clientId: `seed-client-${slotId}-${i}`,
        equipmentRentalRequested: false,
        status: "active",
        wasLateCancellation: null,
        createdAt: new Date().toISOString(),
      });
    }
  });
}
// Демо-клиент с уже накопленной историей — войти можно тем же именем и телефоном,
// что в data.ts (Соня, +7 900 000-00-00), чтобы сразу увидеть непустой профиль/историю,
// не проходя весь путь до статуса "постоянный клиент" вручную.
function seedDemoClient() {
  const key = normalizePhone(currentClient.contact);
  db.clients[key] = { ...currentClient, id: key };
}
seedDemoClient();

seedPhantomBookings();
