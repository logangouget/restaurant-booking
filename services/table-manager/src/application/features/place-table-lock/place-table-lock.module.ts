import { Module } from '@nestjs/common';
import { PlaceTableLockHandler } from './place-table-lock.handler';
import { TABLE_EVENT_STORE_REPOSITORY_INTERFACE } from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import { TableEventStoreRepository } from '@/infrastructure/repository/event-store/table.event-store.repository';

@Module({
  providers: [
    PlaceTableLockHandler,
    {
      provide: TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
      useClass: TableEventStoreRepository,
    },
  ],
})
export class PlaceTableLockModule {}
