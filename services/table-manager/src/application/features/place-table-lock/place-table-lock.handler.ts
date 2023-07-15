import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
  TableEventStoreRepositoryInterface,
} from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import { PlaceTableLockCommand } from './place-table-lock.command';
import { Inject } from '@nestjs/common';
import { Table } from '@/domain/table';
import { TableNotFoundError } from '@/application/errors';
import { TableLockPlacementFailedEvent } from '@rb/events';

@CommandHandler(PlaceTableLockCommand)
export class PlaceTableLockHandler
  implements ICommandHandler<PlaceTableLockCommand>
{
  constructor(
    @Inject(TABLE_EVENT_STORE_REPOSITORY_INTERFACE)
    private readonly tableEventStoreRepository: TableEventStoreRepositoryInterface,
  ) {}

  async execute(command: PlaceTableLockCommand): Promise<Table> {
    const table = await this.tableEventStoreRepository.findTableById(
      command.id,
    );

    if (!table) {
      const failureEvent = new TableLockPlacementFailedEvent(
        command.id,
        command.timeSlot,
        'Table not found',
        command.correlationId,
      );

      await this.tableEventStoreRepository.publish([failureEvent]);

      throw new TableNotFoundError(command.id);
    }

    table.placeLock(command.timeSlot);

    const tableEvents = table.getUncommittedEvents();

    for (const event of tableEvents) {
      event.setCorrelationId(command.correlationId);
    }

    await this.tableEventStoreRepository.publish(tableEvents);

    return table;
  }
}
