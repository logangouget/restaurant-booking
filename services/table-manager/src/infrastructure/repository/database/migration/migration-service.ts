import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as postgres from 'postgres';

@Injectable()
export class MigrationService {
  constructor(private readonly configService: ConfigService) {}

  async migrate() {
    const sql = postgres(this.configService.get('POSTGRES_CONNECTION_STRING'), {
      max: 1,
    });
    const db = drizzle(sql);

    await migrate(db, {
      migrationsFolder: this.configService.get('DRIZZLE_MIGRATION_FOLDER'),
    });
  }
}
