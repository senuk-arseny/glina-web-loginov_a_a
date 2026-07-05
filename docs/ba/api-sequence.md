# api-sequence.md — Гончарная мастерская «Глина»

## 1. Вход (без SMS)

```mermaid
sequenceDiagram
    participant C as Client (Web App)
    participant API as Backend API

    C->>API: POST /auth/login-or-register {name, phone}
    API-->>C: 200 {clientId, profile}
```

## 2. Create Booking

```mermaid
sequenceDiagram
    participant C as Client (Web App)
    participant API as Backend API

    C->>API: GET /slots/{slotId}
    API-->>C: 200 {slot, freeSpots, equipmentRental}
    C->>API: POST /bookings {slotId, equipmentRentalRequested}
    alt место есть и клиент ещё не записан
        API-->>C: 201 {booking, status: active}
    else мест не осталось
        API-->>C: 409 {error: "no_free_spots"}
        C->>C: показать ошибку + предложить waitlist
    else клиент уже записан на этот слот
        API-->>C: 409 {error: "already_booked"}
    end
```

## 3. Cancel Booking

Важно: логика ранней/поздней отмены определяется **на бэкенде**, клиент не вычисляет время сам (ненадёжно и небезопасно — единый источник истины должен быть один).

```mermaid
sequenceDiagram
    participant C as Client (Web App)
    participant API as Backend API

    C->>API: POST /bookings/{bookingId}/cancel
    API->>API: определить раннюю/позднюю отмену (< 2ч до start)
    API->>API: восстановить фонd проката, если был запрошен
    API-->>C: 200 {status: cancelled_by_client, wasLate}
    Note over API: бэкенд освобождает место,<br/>уведомляет первого в waitlist (если есть)
```
