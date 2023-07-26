import { SlotUnavailableException } from '@/domain/exceptions';
import { TableBooking } from '@/domain/table-booking';
import {
  TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE,
  TableBookingEventStoreRepositoryInterface,
} from '@/infrastructure/repository/event-store/table-booking.event-store.repository.interface';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InitiateTableBookingCommand } from './initiate-table-booking.command';

@CommandHandler(InitiateTableBookingCommand)
export class InitiateTableBookingHandler
  implements ICommandHandler<InitiateTableBookingCommand>
{
  constructor(
    @Inject(TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE)
    private readonly tableBookingEventStoreRepository: TableBookingEventStoreRepositoryInterface,
  ) {}

  async execute(command: InitiateTableBookingCommand): Promise<TableBooking> {
    const tableAvailable =
      await this.tableBookingEventStoreRepository.isTableAvailableForTimeSlot(
        command.tableId,
        command.timeSlot,
      );

    if (!tableAvailable) {
      throw new SlotUnavailableException(command.tableId);
    }

    const tableBooking = new TableBooking();

    tableBooking.initiate(command.tableId, command.timeSlot);

    const tableBookingEvents = tableBooking.getUncommittedEvents();

    for (const event of tableBookingEvents) {
      event.setCorrelationId(tableBooking.id);
    }

    await this.tableBookingEventStoreRepository.publish(tableBookingEvents);

    return tableBooking;
  }
}
