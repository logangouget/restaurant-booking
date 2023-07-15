import { tables } from '@/infrastructure/repository/database/schemas';
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { isNull } from 'drizzle-orm';
import { ListTablesQuery, ListTablesQueryResult } from './list-tables.query';
import {
  DB,
  DbType,
} from '@/infrastructure/repository/database/database.module';

@QueryHandler(ListTablesQuery)
export class ListTablesHandler implements IQueryHandler<ListTablesQuery> {
  constructor(
    @Inject(DB)
    private readonly db: DbType,
  ) {}

  async execute(): Promise<ListTablesQueryResult> {
    const tableResults = await this.db
      .select({
        id: tables.id,
        seats: tables.seats,
      })
      .from(tables)
      .where(isNull(tables.removedAt));

    return tableResults;
  }
}
