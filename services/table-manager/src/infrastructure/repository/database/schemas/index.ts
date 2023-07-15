import { integer, pgSchema, timestamp, varchar } from 'drizzle-orm/pg-core';

export const tableManagerSchemaName = 'table_manager';
export const tablesTableName = 'tables';

export const tableManagerSchema = pgSchema(tableManagerSchemaName);

export const tables = tableManagerSchema.table(tablesTableName, {
  id: varchar('id', { length: 256 }).primaryKey(),
  seats: integer('seats'),
  removedAt: timestamp('removed_at'),
  revision: integer('revision'),
});
