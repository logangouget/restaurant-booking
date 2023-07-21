import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EVENT_STORE_SERVICE,
  EventStoreService,
  ackAllPersistentSubscriptionEvents,
} from '@rb/event-sourcing';

export const clearSagaSubscriptions = async (app: INestApplication) => {
  const eventStoreService = app.get<EventStoreService>(EVENT_STORE_SERVICE);
  const configService = app.get<ConfigService>(ConfigService);

  await Promise.all([
    ackAllPersistentSubscriptionEvents(eventStoreService, {
      streamName: '$et-table-booking-initiated',
      groupName: configService.get('TABLE_LOCKING_SAGA_GROUP_NAME'),
    }),
    ackAllPersistentSubscriptionEvents(eventStoreService, {
      streamName: '$et-table-lock-placed',
      groupName: configService.get('TABLE_LOCKING_SAGA_GROUP_NAME'),
    }),
  ]);
};
