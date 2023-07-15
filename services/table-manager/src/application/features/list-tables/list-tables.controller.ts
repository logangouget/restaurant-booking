import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ListTablesQuery, ListTablesQueryResult } from './list-tables.query';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ListTablesResponse } from './dto/list-tables.response';

@Controller('tables')
export class ListTablesController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({
    summary: 'List all tables',
    operationId: 'listTables',
  })
  @ApiOkResponse({
    description: 'List of tables',
    type: ListTablesResponse,
  })
  async getAllTables(): Promise<ListTablesResponse> {
    const tableResults = await this.queryBus.execute<
      ListTablesQuery,
      ListTablesQueryResult
    >(new ListTablesQuery());

    return new ListTablesResponse(
      tableResults.map((table) => ({
        id: table.id,
        seats: table.seats,
      })),
    );
  }
}
