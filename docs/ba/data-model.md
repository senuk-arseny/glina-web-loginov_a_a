# data-model.md — Гончарная мастерская «Глина»

Каноническая схема — контракт API (см. openapi.yaml). Клиент читает Program/Slot/Master/EquipmentRental, создаёт/изменяет Booking/WaitlistEntry/Review.

## ER-диаграмма

```mermaid
erDiagram
    PROGRAM ||--o{ SLOT : "содержит"
    MASTER ||--o{ SLOT : "ведёт"
    SLOT ||--o{ BOOKING : "бронируется"
    SLOT ||--o{ WAITLIST_ENTRY : "лист ожидания"
    SLOT ||--|| EQUIPMENT_RENTAL : "фонд проката"
    CLIENT ||--o{ BOOKING : "создаёт"
    CLIENT ||--o{ WAITLIST_ENTRY : "встаёт в очередь"
    BOOKING ||--o| REVIEW : "порождает отзыв"
    MASTER ||--o{ REVIEW : "получает"

    PROGRAM {
        string id
        string name
        int maxParticipants
    }
    SLOT {
        string id
        string programId
        string masterId
        datetime startTime
        int durationMinutes
        string status
    }
    MASTER {
        string id
        string name
        float avgRating
        int reviewsCount
    }
    CLIENT {
        string id
        string name
        string contact
        bool isRegular
        int visitedCount
    }
    BOOKING {
        string id
        string clientId
        string slotId
        bool equipmentRentalRequested
        string status
        datetime createdAt
    }
    WAITLIST_ENTRY {
        string id
        string clientId
        string slotId
        string status
        datetime createdAt
    }
    EQUIPMENT_RENTAL {
        string slotId
        int availableSets
        decimal pricePerSet
    }
    REVIEW {
        string id
        string bookingId
        string masterId
        int rating
        string comment
        datetime createdAt
    }
```

## Важное архитектурное решение (принято по ходу разработки)

`Slot.freeSpots` **не хранится** как поле — это вычисляемая величина: `Program.maxParticipants − количество активных Booking на слот`. Это осознанный выбор после того, как хранимое поле создавало риск рассинхрона (см. `docs/bugs/bug-03-equipment-rental-leak.md` и обсуждение в диалоге о лимите программы). Аналогично `WaitlistEntry.position` не хранится, а всегда пересчитывается по текущему состоянию очереди.

## Примечания
- Slot.status: `active` | `cancelled_by_studio`
- Booking.status: `active` | `cancelled_by_client` | `cancelled_by_studio` | `completed`
- WaitlistEntry.status: `waiting` | `notified` | `converted` | `expired`
