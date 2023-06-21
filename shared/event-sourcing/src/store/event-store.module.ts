import { EventStoreDBClient } from '@eventstore/db-client';
import { Global, Module } from '@nestjs/common';
import {
  EventStoreDbService,
  EVENT_STORE_DB_CLIENT,
} from './event-store-db.service';

@Global()
@Module({
  providers: [
    {
      provide: EVENT_STORE_DB_CLIENT,
      useValue: new EventStoreDBClient(
        {
          endpoint: 'localhost:2113',
        },
        {
          insecure: true,
        },
      ),
    },
    EventStoreDbService,
  ],
  exports: [EventStoreDbService, EVENT_STORE_DB_CLIENT],
})
export class EventStoreModule {}
