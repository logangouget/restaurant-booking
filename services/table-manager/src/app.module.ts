import { EventStoreDBClient } from '@eventstore/db-client';
import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { EVENT_STORE_DB_CLIENT, EventStoreModule } from '@rb/event-sourcing';
import { AddTableModule } from './features/add-table/add-table.module';
import { RemoveTableModule } from './features/remove-table/remove-table.module';

@Module({
  imports: [EventStoreModule, AddTableModule, RemoveTableModule],
  controllers: [],
  providers: [],
})
export class AppModule implements OnModuleDestroy {
  constructor(
    @Inject(EVENT_STORE_DB_CLIENT)
    private readonly eventStoreClient: EventStoreDBClient,
  ) {}

  async onModuleDestroy() {
    await this.eventStoreClient.dispose();
  }
}
