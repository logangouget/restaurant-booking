import { AddTableModule } from '@/application/features/add-table/add-table.module';
import { RemoveTableModule } from '@/application/features/remove-table/remove-table.module';
import { TableLockingSaga } from '@/application/sagas/table-locking.saga';
import {
  Inject,
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
import { PlaceTableLockModule } from './application/features/place-table-lock/place-table-lock.module';

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
    @Inject(EVENT_STORE_SERVICE)
    private readonly eventStoreService: EventStoreService,
    private readonly tableBookingSaga: TableLockingSaga,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.tableBookingSaga.init();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.eventStoreService.closeClient();
  }
}
