import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfirmTableBookingCommand } from './confirm-table-booking.command';
import {
  TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE,
  TableBookingEventStoreRepositoryInterface,
} from '@/infrastructure/repository/event-store/table-booking.event-store.repository.interface';
import { Inject } from '@nestjs/common';
import { TableBookingNotFoundError } from '@/application/errors';
import { TableBooking } from '@/domain/table-booking';

@CommandHandler(ConfirmTableBookingCommand)
export class ConfirmTableBookingHandler
  implements ICommandHandler<ConfirmTableBookingCommand>
{
  constructor(
    @Inject(TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE)
    private readonly tableBookingRepository: TableBookingEventStoreRepositoryInterface,
  ) {}

  async execute(command: ConfirmTableBookingCommand): Promise<TableBooking> {
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

    tableBooking.confirm();

    const events = tableBooking.getUncommittedEvents();

    for (const event of events) {
      event.setCorrelationId(command.correlationId);
    }

    await this.tableBookingRepository.publish(events);

    return tableBooking;
  }
}
