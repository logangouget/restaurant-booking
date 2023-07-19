import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EVENT_STORE_SERVICE,
  EventStoreService,
  ackAllPersistentSubscriptionEvents,
} from '@rb/event-sourcing';

export const clearProjections = async (app: INestApplication) => {
  const eventStoreService = app.get<EventStoreService>(EVENT_STORE_SERVICE);
  const configService = app.get<ConfigService>(ConfigService);

  await Promise.all([
    ackAllPersistentSubscriptionEvents(eventStoreService, {
      streamName: '$ce-table_booking',
      groupName: configService.get<string>('BOOKING_PROJECTION_GROUP_NAME'),
    }),
    ackAllPersistentSubscriptionEvents(eventStoreService, {
      streamName: '$ce-table',
      groupName: configService.get<string>('TABLE_PROJECTION_GROUP_NAME'),
    }),
  ]);
};
