import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// db в mock/api.ts — module-level синглтон, который наполняется сид-данными один раз
// при импорте. Чтобы тесты не "делились" состоянием (бронь, созданная в одном тесте,
// не должна протекать в следующий), перед каждым тестом сбрасываем реестр модулей
// и импортируем api.ts заново — получаем свежий db с нуля.
let api: typeof import("./api");

beforeEach(async () => {
  vi.resetModules();
  api = await import("./api");
});

// Проверяем ошибку по форме (payload.error), а не через instanceof ApiException:
// vi.resetModules() пересоздаёт "../types" при каждом динамическом импорте api.ts,
// поэтому класс ApiException, статически импортированный один раз наверху файла,
// технически становится "другим классом", чем тот, что бросает свежая копия api.ts.
function expectApiError(fn: () => void, expectedCode: string) {
  try {
    fn();
    throw new Error(`Ожидалась ошибка "${expectedCode}", но функция не выбросила исключение`);
  } catch (e) {
    const payload = (e as { payload?: { error?: string } } | null)?.payload;
    expect(payload?.error).toBe(expectedCode);
  }
}

describe("createBooking — регресс bug-01 (дублирующая бронь)", () => {
  it("блокирует повторную активную бронь того же клиента на тот же слот", () => {
    api.createBooking("client-x", "slot-1", false);
    expectApiError(() => api.createBooking("client-x", "slot-1", false), "already_booked");
  });

  it("после отмены брони тот же клиент может забронировать слот заново", () => {
    const booking = api.createBooking("client-x", "slot-1", false);
    api.cancelBooking(booking.id);
    expect(() => api.createBooking("client-x", "slot-1", false)).not.toThrow();
  });
});

describe("createBooking — лимит участников программы (TC-09)", () => {
  it("отклоняет бронь, если слот уже заполнен до лимита программы", () => {
    // slot-3 — новичковая программа (лимит 6), в сид-данных уже заполнена 6 фейковыми бронями
    expectApiError(() => api.createBooking("client-x", "slot-3", false), "no_free_spots");
  });

  it("не позволяет превысить лимит даже если очистить одно место и попытаться занять два", () => {
    // slot-2 — круг (лимит 10), заполнен до 1 свободного места
    api.createBooking("client-a", "slot-2", false); // занимает последнее место
    expectApiError(() => api.createBooking("client-b", "slot-2", false), "no_free_spots");
  });
});

describe("createBooking — отменённый мастерской слот", () => {
  it("не позволяет забронировать слот со статусом cancelled_by_studio", () => {
    // slot-7 — заранее отменён мастерской в сид-данных
    expectApiError(() => api.createBooking("client-x", "slot-7", false), "slot_cancelled");
  });
});

describe("cancelBooking — граница ранней/поздней отмены ровно в 2 часа", () => {
  const FIXED_NOW = new Date("2026-07-05T10:00:00.000Z").getTime();

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    vi.resetModules();
    api = await import("./api"); // slot-1 стартует через 3ч от FIXED_NOW — фиксируем это под фейковыми часами
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("отмена ровно за 2 часа до начала — НЕ считается поздней (граница включительно в пользу клиента)", () => {
    const booking = api.createBooking("client-x", "slot-1", false);
    vi.setSystemTime(FIXED_NOW + 1 * 60 * 60 * 1000); // до начала осталось ровно 2ч
    const result = api.cancelBooking(booking.id);
    expect(result.wasLate).toBe(false);
  });

  it("отмена на 1мс позже границы (до начала < 2ч) — считается поздней", () => {
    const booking = api.createBooking("client-x", "slot-1", false);
    vi.setSystemTime(FIXED_NOW + 1 * 60 * 60 * 1000 + 1); // до начала осталось 2ч - 1мс
    const result = api.cancelBooking(booking.id);
    expect(result.wasLate).toBe(true);
  });

  it("отмена на 1мс раньше границы (до начала > 2ч) — НЕ считается поздней", () => {
    const booking = api.createBooking("client-x", "slot-1", false);
    vi.setSystemTime(FIXED_NOW + 1 * 60 * 60 * 1000 - 1); // до начала осталось 2ч + 1мс
    const result = api.cancelBooking(booking.id);
    expect(result.wasLate).toBe(false);
  });
});

describe("cancelBooking — регресс bug-03 (утечка фонда проката)", () => {
  it("возвращает комплект инструментов в доступный фонд при отмене брони с прокатом", () => {
    const before = api.getSlotDetails("slot-1").equipmentRental.availableSets;
    const booking = api.createBooking("client-x", "slot-1", true);
    expect(api.getSlotDetails("slot-1").equipmentRental.availableSets).toBe(before - 1);

    api.cancelBooking(booking.id);
    expect(api.getSlotDetails("slot-1").equipmentRental.availableSets).toBe(before);
  });
});

describe("joinWaitlist — регресс: нельзя встать в очередь на отменённый слот", () => {
  it("отклоняет попытку встать в лист ожидания на слот со статусом cancelled_by_studio", () => {
    expectApiError(() => api.joinWaitlist("client-x", "slot-7"), "slot_cancelled");
  });

  it("позиция в очереди растёт по порядку присоединения (FIFO)", () => {
    // slot-3 полностью заполнен фейковыми бронями в сид-данных — подходит для листа ожидания
    const first = api.joinWaitlist("client-a", "slot-3");
    const second = api.joinWaitlist("client-b", "slot-3");

    expect(api.getWaitlistPosition(first.id)).toBe(1);
    expect(api.getWaitlistPosition(second.id)).toBe(2);
  });
});

describe("loginOrRegister — регресс: разные форматы одного номера должны давать один профиль", () => {
  it("номер с ведущей 8 и номер с +7 считаются одним и тем же клиентом", () => {
    const first = api.loginOrRegister("Арсений", "89001234567");
    const second = api.loginOrRegister("Арсений", "+7 900 123-45-67");
    expect(second.id).toBe(first.id);
  });

  it("разные номера дают разных клиентов", () => {
    const first = api.loginOrRegister("Клиент 1", "+7 900 111-11-11");
    const second = api.loginOrRegister("Клиент 2", "+7 900 222-22-22");
    expect(second.id).not.toBe(first.id);
  });
});

describe("createReview — валидация рейтинга и запрет повторной оценки", () => {
  it("отклоняет рейтинг вне диапазона 1-5", () => {
    const booking = api.createBooking("client-x", "slot-1", false);
    api.markBookingCompleted(booking.id);
    expectApiError(() => api.createReview(booking.id, 0), "invalid_rating");
    expectApiError(() => api.createReview(booking.id, 6), "invalid_rating");
  });

  it("не позволяет оценить одну и ту же бронь дважды", () => {
    const booking = api.createBooking("client-x", "slot-1", false);
    api.markBookingCompleted(booking.id);
    api.createReview(booking.id, 5);
    expectApiError(() => api.createReview(booking.id, 4), "already_reviewed");
  });
});
