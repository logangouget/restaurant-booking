import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AddTableCommand } from './add-table.command';
import { Table } from '../../domain/table';
import {
  TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
  TableEventStoreRepositoryInterface,
} from '../../infrastructure/repository/table.event-store.repository.interface';
import { Inject } from '@nestjs/common';

@CommandHandler(AddTableCommand)
export class AddTable implements ICommandHandler<AddTableCommand> {
  constructor(
    @Inject(TABLE_EVENT_STORE_REPOSITORY_INTERFACE)
    private readonly tableEventStoreRepository: TableEventStoreRepositoryInterface,
  ) {}

  async execute(command: AddTableCommand): Promise<Table> {
    const existingTable = await this.tableEventStoreRepository.findTableById(
      command.id,
    );

    if (existingTable) {
      throw new Error('Table already exists');
    }

    const table = new Table(command.id, command.seats);
    table.add();
    table.commit();

    await this.tableEventStoreRepository.publish(table.getUncommittedEvents());

    return table;
  }
}
