export type SlotStatus = "active" | "cancelled_by_studio";
export type BookingStatus =
  | "active"
  | "cancelled_by_client"
  | "cancelled_by_studio"
  | "completed";
export type WaitlistStatus = "waiting" | "notified" | "converted" | "expired";

export interface Program {
  id: string;
  name: string;
  description: string;
  maxParticipants: number;
}

export interface Master {
  id: string;
  name: string;
  avgRating: number;
  reviewsCount: number;
}

export interface EquipmentRental {
  slotId: string;
  availableSets: number;
  pricePerSet: number;
}

export interface Slot {
  id: string;
  programId: string;
  masterId: string;
  startTime: string; // ISO
  durationMinutes: number;
  status: SlotStatus;
  cancellationReason?: string | null;
}

export interface Booking {
  id: string;
  slotId: string;
  clientId: string;
  equipmentRentalRequested: boolean;
  status: BookingStatus;
  wasLateCancellation: boolean | null;
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  slotId: string;
  clientId: string;
  status: WaitlistStatus;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  masterId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  contact: string;
  isRegular: boolean;
  visitedCount: number;
  lateCancellationCount: number;
}

export type NotificationType =
  | "booking_confirmed"
  | "reminder"
  | "cancelled_by_studio"
  | "waitlist_spot_available";

export interface AppNotification {
  id: string;
  clientId: string;
  type: NotificationType;
  message: string;
  createdAt: string;
  read: boolean;
  relatedSlotId?: string;
  relatedBookingId?: string;
}

export interface ApiError {
  error: string;
  message: string;
}

export class ApiException extends Error {
  payload: ApiError;
  constructor(payload: ApiError) {
    super(payload.message);
    this.payload = payload;
  }
}
