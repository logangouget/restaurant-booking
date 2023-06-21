import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TableEventStoreRepository } from '../../infrastructure/repository/table.event-store.repository';
import { TABLE_EVENT_STORE_REPOSITORY_INTERFACE } from '../../infrastructure/repository/table.event-store.repository.interface';
import { AddTableController } from './add-table.controller';
import { AddTableHandler } from './add-table.handler';

@Module({
  imports: [CqrsModule],
  providers: [
    AddTableHandler,
    {
      provide: TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
      useClass: TableEventStoreRepository,
    },
  ],
  controllers: [AddTableController],
})
export class AddTableModule {}
