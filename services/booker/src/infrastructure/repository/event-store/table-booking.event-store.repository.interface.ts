import { TableBookingEvent } from '@rb/events';
import { TableBooking, TimeSlot } from '@/domain/table-booking';

export const TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE =
  'TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE';

export interface TableBookingEventStoreRepositoryInterface {
  isTableAvailableForTimeSlot(
    tableId: string,
    timeSlot: TimeSlot,
  ): Promise<boolean>;
  findBookingById(id: string): Promise<TableBooking | null>;
  publish(events: TableBookingEvent[]): Promise<void>;
}
