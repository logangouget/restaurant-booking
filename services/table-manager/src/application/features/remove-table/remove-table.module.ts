import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { RemoveTableHandler } from './remove-table.handler';
import { TABLE_EVENT_STORE_REPOSITORY_INTERFACE } from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import { TableEventStoreRepository } from '@/infrastructure/repository/event-store/table.event-store.repository';
import { RemoveTableController } from './remove-table.controller';

@Module({
  imports: [CqrsModule],
  providers: [
    RemoveTableHandler,
    {
      provide: TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
      useClass: TableEventStoreRepository,
    },
  ],
  controllers: [RemoveTableController],
})
export class RemoveTableModule {}
