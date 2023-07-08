import { AddTableModule } from '@/application/features/add-table/add-table.module';
import { RemoveTableModule } from '@/application/features/remove-table/remove-table.module';
import { TableLockingSaga } from '@/application/sagas/table-locking.saga';
import { EventStoreDBClient } from '@eventstore/db-client';
import {
  Inject,
  Module,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EVENT_STORE_DB_CLIENT, EventStoreModule } from '@rb/event-sourcing';
import { PlaceTableLockModule } from './application/features/place-table-lock/place-table-lock.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
    AddTableModule,
    RemoveTableModule,
    PlaceTableLockModule,
  ],
  providers: [TableLockingSaga],
})
export class AppModule implements OnModuleDestroy, OnApplicationBootstrap {
  constructor(
    @Inject(EVENT_STORE_DB_CLIENT)
    private readonly eventStoreClient: EventStoreDBClient,
    private readonly tableBookingSaga: TableLockingSaga,
  ) {}

  async onModuleDestroy() {
    await this.eventStoreClient.dispose();
  }

  async onApplicationBootstrap() {
    await this.tableBookingSaga.init();
  }
}
