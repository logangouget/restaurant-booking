import { AddTableModule } from '@/application/features/add-table/add-table.module';
import { RemoveTableModule } from '@/application/features/remove-table/remove-table.module';
import { TableLockingSaga } from '@/application/sagas/table-locking.saga';
import {
  Inject,
  Logger,
  Module,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import {
  EVENT_STORE_SERVICE,
  EventStoreModule,
  EventStoreService,
} from '@rb/event-sourcing';
import { ListTablesModule } from './application/features/list-tables/list-tables.module';
import { PlaceTableLockModule } from './application/features/place-table-lock/place-table-lock.module';
import { TableProjection } from './application/projections/table.projection';
import {
  DB_CONNECTION,
  DatabaseModule,
  DbConnectionType,
} from './infrastructure/repository/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CqrsModule,
    EventStoreModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          endpoint: configService.get<string>('EVENT_STORE_ENDPOINT'),
          insecure: configService.get<boolean>('EVENT_STORE_INSECURE'),
        };
      },
    }),
    DatabaseModule,
    AddTableModule,
    RemoveTableModule,
    PlaceTableLockModule,
    ListTablesModule,
  ],
  providers: [TableLockingSaga, TableProjection],
})
export class AppModule implements OnModuleDestroy, OnApplicationBootstrap {
  constructor(
    @Inject(EVENT_STORE_SERVICE)
    private readonly eventStoreService: EventStoreService,
    @Inject(DB_CONNECTION)
    private readonly dbConnection: DbConnectionType,
    private readonly tableLockingSaga: TableLockingSaga,
    private readonly tableProjection: TableProjection,
  ) {}

  async onApplicationBootstrap() {
    const logger = new Logger('Bootstrap');

    try {
      await this.tableLockingSaga.init();
      await this.tableProjection.init();
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.eventStoreService.closeClient();
    await this.dbConnection.end();
  }
}
