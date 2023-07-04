import { Controller, Delete, Param, NotFoundException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RemoveTableCommand } from './remove-table.command';
import { TableNotFoundError } from '@/application/errors';
import { ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RemoveTableResponse } from './dto/remove-table.response';

@Controller()
export class RemoveTableController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiTags('tables')
  @ApiProperty({
    description: 'Remove a table',
    type: RemoveTableResponse,
  })
  @ApiResponse({
    status: 200,
    description: 'The table has been successfully removed.',
    type: RemoveTableResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'The table does not exist.',
  })
  @Delete('tables/:id')
  async addTable(@Param('id') id: string): Promise<RemoveTableResponse> {
    const command = new RemoveTableCommand(id);

    try {
      await this.commandBus.execute<RemoveTableCommand, undefined>(command);
    } catch (error) {
      if (error instanceof TableNotFoundError) {
        throw new NotFoundException(error.message);
      }
    }

    return new RemoveTableResponse(id);
  }
}
