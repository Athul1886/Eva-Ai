export type BookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface Booking {
  bookingId: string;
  providerId: string;
  providerName: string;
  category: string;
  eventId?: string;
  eventType?: string;
  eventDate?: string;
  location?: string;
  guestCount?: number | '';
  startingPrice?: number;
  status: BookingStatus;
  createdAt: string;
  notes?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  updatedAt?: string;
}
