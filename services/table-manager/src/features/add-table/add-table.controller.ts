import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Table } from '../../domain/table';
import { AddTableCommand } from './add-table.command';
import { AddTableRequest } from './dto/add-table.request';
import { AddTableResponse } from './dto/add-table.response';
import { ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConflictException } from '@nestjs/common/exceptions';
import { TableAlreadyExistsError } from './errors';

@Controller()
export class AddTableController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiTags('tables')
  @ApiProperty({
    description: 'Add a new table',
    type: AddTableRequest,
  })
  @ApiResponse({
    status: 201,
    description: 'The table has been successfully added.',
    type: AddTableResponse,
  })
  @ApiResponse({
    status: 409,
    description: 'The table already exists.',
  })
  @Post('tables')
  async addTable(@Body() body: AddTableRequest): Promise<AddTableResponse> {
    const command = new AddTableCommand(body.name, body.numberOfSeats);

    try {
      const table = await this.commandBus.execute<AddTableCommand, Table>(
        command,
      );
      return new AddTableResponse(table.id);
    } catch (error) {
      if (error instanceof TableAlreadyExistsError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }
}
