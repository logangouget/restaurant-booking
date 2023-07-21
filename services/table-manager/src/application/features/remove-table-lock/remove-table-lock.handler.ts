import { TableNotFoundError } from '@/application/errors';
import { Table } from '@/domain/table';
import {
  TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
  TableEventStoreRepositoryInterface,
} from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RemoveTableLockCommand } from './remove-table-lock.command';

@CommandHandler(RemoveTableLockCommand)
export class RemoveTableLockHandler
  implements ICommandHandler<RemoveTableLockCommand>
{
  constructor(
    @Inject(TABLE_EVENT_STORE_REPOSITORY_INTERFACE)
    private readonly tableEventStoreRepository: TableEventStoreRepositoryInterface,
  ) {}

  async execute(command: RemoveTableLockCommand): Promise<Table> {
    const table = await this.tableEventStoreRepository.findTableById(
      command.tableId,
    );

    if (!table) {
      throw new TableNotFoundError(command.tableId);
    }

    table.removeLock({
      from: new Date(command.timeSlot.from),
      to: new Date(command.timeSlot.to),
    });

    const tableEvents = table.getUncommittedEvents();

    for (const event of tableEvents) {
      event.setCorrelationId(command.correlationId);
    }

    await this.tableEventStoreRepository.publish(tableEvents);

    return table;
  }
}
