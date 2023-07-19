import { InitiateTableBookingModule } from '@/application/features/initiate-table-booking/initiate-table-booking.module';
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
import { CancelTableBookingModule } from './application/features/cancel-table-booking/cancel-table-booking.module';
import { ConfirmTableBookingModule } from './application/features/confirm-table-booking/confirm-table-booking.module';
import { TableProjection } from './application/projections/table.projection';
import { TableBookingSaga } from './application/sagas/table-booking.saga';
import {
  DB_CONNECTION,
  DatabaseModule,
  DbConnectionType,
} from './infrastructure/repository/database/database.module';
import { BookingProjection } from './application/projections/booking.projection';
import { ListAvailableBookingSlotsModule } from './application/features/list-available-booking-slots/list-available-booking-slots.module';

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
    InitiateTableBookingModule,
    ConfirmTableBookingModule,
    CancelTableBookingModule,
    ListAvailableBookingSlotsModule,
  ],
  providers: [TableBookingSaga, TableProjection, BookingProjection],
})
export class AppModule implements OnModuleDestroy, OnApplicationBootstrap {
  constructor(
    @Inject(EVENT_STORE_SERVICE)
    private readonly eventStoreService: EventStoreService,
    private readonly tableBookingSaga: TableBookingSaga,
    @Inject(DB_CONNECTION)
    private readonly dbConnection: DbConnectionType,
    private readonly tableProjection: TableProjection,
    private readonly bookingProjection: BookingProjection,
  ) {}

  async onApplicationBootstrap() {
    const logger = new Logger('Bootstrap');

    try {
      await this.tableBookingSaga.init();
      await this.tableProjection.init();
      await this.bookingProjection.init();
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
