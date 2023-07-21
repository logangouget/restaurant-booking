import { Module } from '@nestjs/common';
import { ScheduleTableLockRemovalHandler } from './schedule-table-lock-removal.handler';
import { RemoveTableLockJobProcessor } from './remove-table-lock.job-processor';
import { CqrsModule } from '@nestjs/cqrs';
import { TABLE_EVENT_STORE_REPOSITORY_INTERFACE } from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import { TableEventStoreRepository } from '@/infrastructure/repository/event-store/table.event-store.repository';
import { BullModule } from '@nestjs/bull';
import { RemoveTableLockHandler } from './remove-table-lock.handler';

@Module({
  imports: [
    CqrsModule,
    BullModule.registerQueue({
      name: 'remove-table-lock',
    }),
  ],
  providers: [
    {
      provide: TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
      useClass: TableEventStoreRepository,
    },
    ScheduleTableLockRemovalHandler,
    RemoveTableLockJobProcessor,
    RemoveTableLockHandler,
  ],
})
export class RemoveTableLockModule {}
