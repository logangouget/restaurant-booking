import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
  TableEventStoreRepositoryInterface,
} from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import { RemoveTableCommand } from './remove-table.command';
import { TableNotFoundError } from '@/application/errors';

@CommandHandler(RemoveTableCommand)
export class RemoveTableHandler implements ICommandHandler<RemoveTableCommand> {
  constructor(
    @Inject(TABLE_EVENT_STORE_REPOSITORY_INTERFACE)
    private readonly tableEventStoreRepository: TableEventStoreRepositoryInterface,
  ) {}

  async execute(command: RemoveTableCommand): Promise<void> {
    const table = await this.tableEventStoreRepository.findTableById(
      command.id,
    );

    if (!table) {
      throw new TableNotFoundError(command.id);
    }

    table.remove();

    await this.tableEventStoreRepository.publish(table.getUncommittedEvents());
  }
}
