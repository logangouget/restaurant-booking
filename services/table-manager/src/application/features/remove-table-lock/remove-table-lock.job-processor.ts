import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Job } from 'bullmq';
import { RemoveTableLockCommand } from './remove-table-lock.command';
import { RemoveTableLockJobPayload } from './remove-table-lock.job-payload';

@Processor('remove-table-lock')
export class RemoveTableLockJobProcessor {
  private readonly logger = new Logger(RemoveTableLockJobProcessor.name);

  constructor(private readonly commandBus: CommandBus) {}

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

    await this.commandBus.execute(
      new RemoveTableLockCommand(
        job.data.tableId,
        {
          from: new Date(job.data.timeSlot.from),
          to: new Date(job.data.timeSlot.to),
        },
        job.data.correlationId,
      ),
    );
  }
}
