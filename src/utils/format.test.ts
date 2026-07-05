import { describe, it, expect } from "vitest";
import { parseDateInputStart, parseDateInputEnd, formatDateTime } from "./format";

describe("parseDateInputStart / parseDateInputEnd — регресс bug-02 (off-by-one в фильтре дат)", () => {
  it("parseDateInputEnd возвращает конец дня (23:59:59.999), а не полночь", () => {
    const end = parseDateInputEnd("2026-07-06");
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });

  it("занятие в 18:00 выбранного последнего дня диапазона попадает в интервал [start, end]", () => {
    const start = parseDateInputStart("2026-07-04");
    const end = parseDateInputEnd("2026-07-06");
    const classAt18OnLastDay = new Date(2026, 6, 6, 18, 0, 0).getTime();

    expect(classAt18OnLastDay).toBeGreaterThanOrEqual(start.getTime());
    expect(classAt18OnLastDay).toBeLessThanOrEqual(end.getTime());
  });

  it("parseDateInputStart возвращает локальную полночь, а не UTC-полночь", () => {
    const start = parseDateInputStart("2026-07-06");
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });
});

describe("formatDateTime — регресс bug (секунды в отображении времени)", () => {
  it("не содержит секунд в отформатированной строке", () => {
    const formatted = formatDateTime("2026-07-05T18:55:50.000Z");
    // Строка вида "05.07.2026, 21:55" — секунд быть не должно
    expect(formatted).not.toMatch(/:\d{2}:\d{2}(\D|$)/);
  });
});
