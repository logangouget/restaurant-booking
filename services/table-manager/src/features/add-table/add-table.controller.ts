import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Table } from '../../domain/table';
import { AddTableCommand } from './add-table.command';

export class AddTableRequest {
  name: string;
  numberOfSeats: number;
}

export class AddTableResponse {
  id: string;

  constructor(id: string) {
    this.id = id;
  }
}

@Controller()
export class AddTableController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('tables')
  async addTable(@Body() body: AddTableRequest): Promise<AddTableResponse> {
    const command = new AddTableCommand(body.name, body.numberOfSeats);
    const table = await this.commandBus.execute<AddTableCommand, Table>(
      command,
    );

    return new AddTableResponse(table.id);
  }
}
