import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  EVENT_STORE_DB_CLIENT,
  EventStoreDbService,
} from './event-store-db.service';
import {
  ConfigurableModuleClass,
  EventStoreModuleOptions,
  MODULE_OPTIONS_TOKEN,
} from './event-store.module-definition';
import { EventStoreDBClient } from '@eventstore/db-client';
import { EVENT_STORE_SERVICE } from './event-store.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EVENT_STORE_SERVICE,
      useClass: EventStoreDbService,
    },
    {
      provide: EVENT_STORE_DB_CLIENT,
      useFactory(options: EventStoreModuleOptions) {
        return new EventStoreDBClient(
          {
            endpoint: options.endpoint,
          },
          {
            insecure: options.insecure,
          },
        );
      },
      inject: [MODULE_OPTIONS_TOKEN],
    },
  ],
  exports: [EVENT_STORE_SERVICE],
})
export class EventStoreModule extends ConfigurableModuleClass {}
