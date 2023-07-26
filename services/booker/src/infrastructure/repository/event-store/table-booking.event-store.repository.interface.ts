import { TableBookingEvent } from '@rb/events';
import { TableBooking } from '@/domain/table-booking';
import { TimeSlot } from '@/domain/time-slot.value-object';

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
