import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ListTablesController } from './list-tables.controller';
import { ListTablesHandler } from './list-tables.handler';

@Module({
  imports: [CqrsModule],
  controllers: [ListTablesController],
  providers: [ListTablesHandler],
})
export class ListTablesModule {}
