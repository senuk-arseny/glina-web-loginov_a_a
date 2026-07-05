import type {
  Program,
  Master,
  Slot,
  EquipmentRental,
  ClientProfile,
} from "../types";

// Условное "сейчас" зафиксировано относительно реального Date.now(),
// чтобы фильтр "7 дней" и логика ранней/поздней отмены работали по-настоящему.
const HOUR = 60 * 60 * 1000;

export const programs: Program[] = [
  {
    id: "prog-beginner",
    name: "Лепка для новичков",
    description:
      "Знакомство с глиной, ручная лепка без круга. Для тех, кто впервые.",
    maxParticipants: 6,
  },
  {
    id: "prog-wheel",
    name: "Гончарный круг",
    description:
      "Работа на гончарном круге для тех, кто уже пробовал лепку.",
    maxParticipants: 10,
  },
];

export const masters: Master[] = [
  { id: "master-1", name: "Анна Круглова", avgRating: 4.9, reviewsCount: 34 },
  { id: "master-2", name: "Игорь Смирнов", avgRating: 4.6, reviewsCount: 21 },
  { id: "master-3", name: "Даша Липина", avgRating: 4.2, reviewsCount: 9 },
  { id: "master-4", name: "Павел Гончаров", avgRating: 4.8, reviewsCount: 27 },
];

function makeSlot(
  id: string,
  programId: string,
  masterId: string,
  hoursFromNow: number,
  status: "active" | "cancelled_by_studio" = "active",
  cancellationReason?: string
): Slot {
  return {
    id,
    programId,
    masterId,
    startTime: new Date(Date.now() + hoursFromNow * HOUR).toISOString(),
    durationMinutes: 135,
    status,
    cancellationReason: cancellationReason ?? null,
  };
}

export const slots: Slot[] = [
  makeSlot("slot-1", "prog-beginner", "master-1", 3), // сегодня, много мест
  makeSlot("slot-2", "prog-wheel", "master-2", 5), // почти заполнен (заполняется фейковыми бронями в api.ts)
  makeSlot("slot-3", "prog-beginner", "master-3", 26), // завтра, будет заполнен полностью
  makeSlot("slot-4", "prog-wheel", "master-4", 30), // завтра, круг свободен
  makeSlot("slot-5", "prog-beginner", "master-1", 50),
  makeSlot("slot-6", "prog-wheel", "master-2", 72),
  makeSlot(
    "slot-7",
    "prog-beginner",
    "master-2",
    10,
    "cancelled_by_studio",
    "Сломалась печь, занятие переносится"
  ),
  makeSlot("slot-8", "prog-wheel", "master-4", 150), // за пределами 7 дней
  makeSlot("slot-9", "prog-beginner", "master-3", 168 + 10), // за пределами 7 дней
];

export const equipmentRentals: EquipmentRental[] = [
  { slotId: "slot-1", availableSets: 4, pricePerSet: 300 },
  { slotId: "slot-2", availableSets: 0, pricePerSet: 300 }, // прокат разобрали
  { slotId: "slot-3", availableSets: 0, pricePerSet: 300 },
  { slotId: "slot-4", availableSets: 8, pricePerSet: 300 },
  { slotId: "slot-5", availableSets: 4, pricePerSet: 300 },
  { slotId: "slot-6", availableSets: 6, pricePerSet: 300 },
  { slotId: "slot-7", availableSets: 4, pricePerSet: 300 },
  { slotId: "slot-8", availableSets: 4, pricePerSet: 300 },
  { slotId: "slot-9", availableSets: 4, pricePerSet: 300 },
];

// Единственный "залогиненный" клиент для демо-сессии
export const currentClient: ClientProfile = {
  id: "client-1",
  name: "Соня",
  contact: "+7 900 000-00-00",
  isRegular: false,
  visitedCount: 2,
  lateCancellationCount: 0,
};

// Второй клиент — только чтобы был кто-то впереди в листе ожидания в демо-сценариях
export const otherClientId = "client-2";
