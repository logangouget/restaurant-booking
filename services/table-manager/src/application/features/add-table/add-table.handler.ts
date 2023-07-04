import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AddTableCommand } from './add-table.command';
import { Table } from '@/domain/table';
import {
  TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
  TableEventStoreRepositoryInterface,
} from '@/infrastructure/repository/table.event-store.repository.interface';
import { Inject } from '@nestjs/common';
import { TableAlreadyExistsError } from './errors';

@CommandHandler(AddTableCommand)
export class AddTableHandler implements ICommandHandler<AddTableCommand> {
  constructor(
    @Inject(TABLE_EVENT_STORE_REPOSITORY_INTERFACE)
    private readonly tableEventStoreRepository: TableEventStoreRepositoryInterface,
  ) {}

  async execute(command: AddTableCommand): Promise<Table> {
    const existingTable = await this.tableEventStoreRepository.findTableById(
      command.id,
    );

    if (existingTable) {
      throw new TableAlreadyExistsError(command.id);
    }

    const table = new Table(command.id);
    table.add(command.seats);

    await this.tableEventStoreRepository.publish(table.getUncommittedEvents());

    return table;
  }
}
