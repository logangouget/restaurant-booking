import { InjectQueue } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Queue } from 'bullmq';
import { RemoveTableLockJobPayload } from './remove-table-lock.job-payload';
import { ScheduleTableLockRemovalCommand } from './schedule-table-lock-removal.command';
import {
  TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
  TableEventStoreRepositoryInterface,
} from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import {
  TableLockNotFoundError,
  TableNotFoundError,
} from '@/application/errors';

@CommandHandler(ScheduleTableLockRemovalCommand)
export class ScheduleTableLockRemovalHandler
  implements ICommandHandler<ScheduleTableLockRemovalCommand>
{
  private readonly logger = new Logger(ScheduleTableLockRemovalHandler.name);

  constructor(
    @InjectQueue('remove-table-lock')
    private readonly removeTableLockQueue: Queue,
    @Inject(TABLE_EVENT_STORE_REPOSITORY_INTERFACE)
    private readonly tableEventStoreRepository: TableEventStoreRepositoryInterface,
  ) {}

  async execute(command: ScheduleTableLockRemovalCommand): Promise<void> {
    this.logger.debug(
      `Scheduling job 'remove-table-lock' for table ${
        command.tableId
      } and timeslot ${JSON.stringify(command.timeSlot)}`,
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
        jobId: command.correlationId,
      },
    );
  }
}
