import { Module } from '@nestjs/common';
import { InitiateTableBookingController } from './initiate-table-booking.controller';
import { InitiateTableBookingHandler } from './initiate-table-booking.handler';
import { CqrsModule } from '@nestjs/cqrs';
import { TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE } from '@/infrastructure/repository/table-booking.event-store.repository.interface';
import { TableBookingEventStoreRepository } from '@/infrastructure/repository/table-booking.event-store.repository';

@Module({
  imports: [CqrsModule],
  providers: [
    InitiateTableBookingHandler,
    {
      provide: TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE,
      useClass: TableBookingEventStoreRepository,
    },
  ],
  controllers: [InitiateTableBookingController],
})
export class InitiateTableBookingModule {}
