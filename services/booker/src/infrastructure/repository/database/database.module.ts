import { FactoryProvider, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostgresJsDatabase, drizzle } from 'drizzle-orm/postgres-js';
import * as postgres from 'postgres';

export const DB = Symbol('DB_SERVICE');
export type DbType = PostgresJsDatabase;

export const DB_CONNECTION = Symbol('DB_CONNECTION');
export type DbConnectionType = ReturnType<typeof postgres>;

export const DbProvider: FactoryProvider = {
  provide: DB,
  inject: [DB_CONNECTION],
  useFactory: (connection: DbConnectionType) => {
    return drizzle(connection);
  },
};

export const DbConnectionProvider: FactoryProvider = {
  provide: DB_CONNECTION,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    return postgres(config.get('POSTGRES_CONNECTION_STRING'));
  },
};

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [DbProvider, DbConnectionProvider],
  exports: [DbProvider, DbConnectionProvider],
})
export class DatabaseModule {}
