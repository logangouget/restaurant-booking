import { TableBookingEvent } from '@rb/events';
import { TableBooking, TimeSlot } from 'src/domain/table-booking';

export const TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE =
  'TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE';

export interface TableBookingEventStoreRepositoryInterface {
  findBookingsByTimeSlot(
    tableId: string,
    timeSlot: TimeSlot,
  ): Promise<TableBooking[]>;
  findBookingByCorrelationId(
    tableId: string,
    correlationId: string,
  ): Promise<TableBooking | null>;
  publish(events: TableBookingEvent[]): Promise<void>;
}
