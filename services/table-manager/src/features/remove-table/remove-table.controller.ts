import { Controller, Delete, Param, NotFoundException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RemoveTableCommand } from './remove-table.command';
import { TableNotFoundError } from './errors';

export class RemoveTableResponse {
  id: string;

  constructor(id: string) {
    this.id = id;
  }
}

@Controller()
export class RemoveTableController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete('tables/:id')
  async addTable(@Param('id') id: string): Promise<RemoveTableResponse> {
    const command = new RemoveTableCommand(id);

    try {
      await this.commandBus.execute<RemoveTableCommand, undefined>(command);
    } catch (error) {
      if (error instanceof TableNotFoundError) {
        throw new NotFoundException("Table doesn't exist");
      }
    }

    return new RemoveTableResponse(id);
  }
}
