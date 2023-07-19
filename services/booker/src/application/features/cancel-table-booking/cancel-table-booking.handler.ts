import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CancelTableBookingCommand } from './cancel-table-booking.command';
import { TableBooking } from '@/domain/table-booking';
import {
  TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE,
  TableBookingEventStoreRepositoryInterface,
} from '@/infrastructure/repository/event-store/table-booking.event-store.repository.interface';
import { Inject } from '@nestjs/common';
import { TableBookingNotFoundError } from '@/application/errors';

@CommandHandler(CancelTableBookingCommand)
export class CancelTableBookingHandler
  implements ICommandHandler<CancelTableBookingCommand>
{
  constructor(
    @Inject(TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE)
    private readonly tableBookingRepository: TableBookingEventStoreRepositoryInterface,
  ) {}

  async execute(command: CancelTableBookingCommand): Promise<TableBooking> {
    const tableBooking =
      await this.tableBookingRepository.findBookingByCorrelationId(
        command.tableId,
        command.correlationId,
      );

    if (!tableBooking) {
      throw new TableBookingNotFoundError(
        command.tableId,
        command.correlationId,
      );
    }

    tableBooking.cancel();

    const events = tableBooking.getUncommittedEvents();

    for (const event of events) {
      event.setCorrelationId(command.correlationId);
    }

    await this.tableBookingRepository.publish(events);

    return tableBooking;
  }
}
