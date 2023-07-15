import {
  DB,
  DbType,
} from '@/infrastructure/repository/database/database.module';
import {
  tableManagerSchemaName,
  tablesTableName,
} from '@/infrastructure/repository/database/schemas';
import { INestApplication } from '@nestjs/common';
import { sql } from 'drizzle-orm';

export const clearDatabase = async (app: INestApplication) => {
  const db: DbType = app.get(DB);

  await db.execute(
    sql.raw(`
    TRUNCATE TABLE ${tableManagerSchemaName}.${tablesTableName};
  `),
  );
};
