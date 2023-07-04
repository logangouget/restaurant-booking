import { Module } from '@nestjs/common';
import { ConfirmTableBookingHandler } from './confirm-table-booking.handler';
import { TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE } from '@/infrastructure/repository/table-booking.event-store.repository.interface';
import { TableBookingEventStoreRepository } from '@/infrastructure/repository/table-booking.event-store.repository';

@Module({
  providers: [
    ConfirmTableBookingHandler,
    {
      provide: TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE,
      useClass: TableBookingEventStoreRepository,
    },
  ],
})
export class ConfirmTableBookingModule {}
