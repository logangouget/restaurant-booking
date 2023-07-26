import { TableNotFoundError } from '@/application/errors';
import { Table } from '@/domain/table';
import {
  TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
  TableEventStoreRepositoryInterface,
} from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RemoveTableLockCommand } from './remove-table-lock.command';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';

@CommandHandler(RemoveTableLockCommand)
export class RemoveTableLockHandler
  implements ICommandHandler<RemoveTableLockCommand>
{
  constructor(
    @Inject(TABLE_EVENT_STORE_REPOSITORY_INTERFACE)
    private readonly tableEventStoreRepository: TableEventStoreRepositoryInterface,
    @InjectQueue('remove-table-lock')
    private readonly removeTableLockQueue: Queue,
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

    const scheduledJob = await this.removeTableLockQueue.getJob(
      command.correlationId,
    );

    if (scheduledJob) {
      await scheduledJob.remove();
    }

    await this.tableEventStoreRepository.publish(tableEvents);

    return table;
  }
}
