import { TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE } from '@/infrastructure/repository/event-store/table-booking.event-store.repository.interface';
import { CancelTableBookingHandler } from './cancel-table-booking.handler';
import { TableBookingEventStoreRepository } from '@/infrastructure/repository/event-store/table-booking.event-store.repository';
import { Module } from '@nestjs/common';
import { CancelTableBookingController } from './cancel-table-booking.controller';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [CqrsModule],
  controllers: [CancelTableBookingController],
  providers: [
    CancelTableBookingHandler,
    {
      provide: TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE,
      useClass: TableBookingEventStoreRepository,
    },
  ],
})
export class CancelTableBookingModule {}
