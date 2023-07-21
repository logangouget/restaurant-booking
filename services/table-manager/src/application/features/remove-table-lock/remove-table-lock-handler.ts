import { InjectQueue } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Queue } from 'bullmq';
import { RemoveTableLockJobPayload } from './remove-table-lock-job-payload';
import { RemoveTableLockCommand } from './remove-table-lock.command';
import {
  TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
  TableEventStoreRepositoryInterface,
} from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import {
  TableLockNotFoundError,
  TableNotFoundError,
} from '@/application/errors';

@CommandHandler(RemoveTableLockCommand)
export class RemoveTableLockHandler
  implements ICommandHandler<RemoveTableLockCommand>
{
  private readonly logger = new Logger(RemoveTableLockHandler.name);

  constructor(
    @InjectQueue('remove-table-lock')
    private readonly removeTableLockQueue: Queue,
    @Inject(TABLE_EVENT_STORE_REPOSITORY_INTERFACE)
    private readonly tableEventStoreRepository: TableEventStoreRepositoryInterface,
  ) {}

  async execute(command: RemoveTableLockCommand): Promise<void> {
    this.logger.debug(
      `Scheduling job 'remove-table-lock' for table ${command.tableId}`,
      {
        timeSlot: command.timeSlot,
      },
    );

    const table = await this.tableEventStoreRepository.findTableById(
      command.tableId,
    );

    if (!table) {
      throw new TableNotFoundError(command.tableId);
    }

    const correspondingLock = table.getLockByTimeSlot(command.timeSlot);

    if (!correspondingLock) {
      throw new TableLockNotFoundError(command.tableId, command.timeSlot);
    }

    const delay = command.timeSlot.to.getTime() - Date.now();

    await this.removeTableLockQueue.add(
      'remove-table-lock',
      {
        tableId: command.tableId,
        timeSlot: {
          from: command.timeSlot.from.toISOString(),
          to: command.timeSlot.to.toISOString(),
        },
        correlationId: command.correlationId,
      } satisfies RemoveTableLockJobPayload,
      {
        delay,
      },
    );
  }
}
