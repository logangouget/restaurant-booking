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

  await ackAllPersistentSubscriptionEvents(eventStoreService, {
    streamName: '$et-table-lock-placed',
    groupName: configService.get('TABLE_BOOKING_SAGA_LOCK_PLACED_GROUP_NAME'),
  });

  await ackAllPersistentSubscriptionEvents(eventStoreService, {
    streamName: '$et-table-lock-placement-failed',
    groupName: configService.get(
      'TABLE_BOOKING_SAGA_LOCK_PLACEMENT_FAILED_GROUP_NAME',
    ),
  });
};
