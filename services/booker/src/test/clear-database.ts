import {
  DB,
  DbType,
} from '@/infrastructure/repository/database/database.module';
import { bookings, tables } from '@/infrastructure/repository/database/schemas';
import { INestApplication } from '@nestjs/common';
import { sql } from 'drizzle-orm';

export const clearDatabase = async (app: INestApplication) => {
  const db: DbType = app.get(DB);

  await db.execute(sql`DELETE FROM ${bookings}`);
  await db.execute(sql`DELETE FROM ${tables}`);
};
