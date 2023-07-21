import { Module } from '@nestjs/common';
import { RemoveTableLockHandler } from './remove-table-lock-handler';
import { RemoveTableLockJobProcessor } from './remove-table-lock-job-processor';
import { CqrsModule } from '@nestjs/cqrs';
import { TABLE_EVENT_STORE_REPOSITORY_INTERFACE } from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import { TableEventStoreRepository } from '@/infrastructure/repository/event-store/table.event-store.repository';
import { BullModule } from '@nestjs/bull';

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
    RemoveTableLockHandler,
    RemoveTableLockJobProcessor,
  ],
})
export class RemoveTableLockModule {}
