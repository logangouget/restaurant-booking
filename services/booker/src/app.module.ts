import { InitiateTableBookingModule } from '@/application/features/initiate-table-booking/initiate-table-booking.module';
import { EventStoreDBClient } from '@eventstore/db-client';
import { Inject, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { EVENT_STORE_DB_CLIENT, EventStoreModule } from '@rb/event-sourcing';
import { ConfirmTableBookingModule } from './application/features/confirm-table-booking/confirm-table-booking.module';
import { TableBookingSaga } from './application/sagas/table-booking.saga';

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
    InitiateTableBookingModule,
    ConfirmTableBookingModule,
  ],
  providers: [TableBookingSaga],
})
export class AppModule implements OnModuleDestroy, OnModuleInit {
  constructor(
    @Inject(EVENT_STORE_DB_CLIENT)
    private readonly eventStoreClient: EventStoreDBClient,
    private readonly tableBookingSaga: TableBookingSaga,
  ) {}

  async onModuleInit() {
    await this.tableBookingSaga.init();
  }

  async onModuleDestroy() {
    await this.eventStoreClient.dispose();
  }
}
