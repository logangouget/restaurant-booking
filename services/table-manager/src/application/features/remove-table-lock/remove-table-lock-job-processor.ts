import {
  TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
  TableEventStoreRepositoryInterface,
} from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { RemoveTableLockJobPayload } from './remove-table-lock-job-payload';
import { Job } from 'bullmq';
import { TableNotFoundError } from '@/application/errors';

@Processor('remove-table-lock')
export class RemoveTableLockJobProcessor {
  private readonly logger = new Logger(RemoveTableLockJobProcessor.name);

  constructor(
    @Inject(TABLE_EVENT_STORE_REPOSITORY_INTERFACE)
    private readonly tableEventStoreRepository: TableEventStoreRepositoryInterface,
  ) {}

  @OnQueueFailed()
  onQueueFailed(job: Job<RemoveTableLockJobPayload>) {
    this.logger.error(
      `Job 'remove-table-lock' failed for table ${job.data.tableId}`,
      {
        timeSlot: job.data.timeSlot,
      },
    );
  }

  @Process('remove-table-lock')
  async removeTableLock(job: Job<RemoveTableLockJobPayload>) {
    this.logger.debug(
      `Processing job 'remove-table-lock' for table ${job.data.tableId}`,
      {
        timeSlot: job.data.timeSlot,
      },
    );

    const table = await this.tableEventStoreRepository.findTableById(
      job.data.tableId,
    );

    if (!table) {
      throw new TableNotFoundError(job.data.tableId);
    }

    table.removeLock({
      from: new Date(job.data.timeSlot.from),
      to: new Date(job.data.timeSlot.to),
    });

    const tableEvents = table.getUncommittedEvents();

    for (const event of tableEvents) {
      event.setCorrelationId(job.data.correlationId);
    }

    await this.tableEventStoreRepository.publish(tableEvents);
  }
}
