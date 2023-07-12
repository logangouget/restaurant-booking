import { AppModule } from '@/app.module';
import { mockedConfigService } from '@/test/mocked-config-service';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import {
  TableBookingInitiatedEvent,
  TableLockPlacementFailedEvent,
} from '@rb/events';
import { TableBookingBaseEvent } from '@rb/events/dist/table-booking/table-booking-base-event';
import { filter, firstValueFrom, take } from 'rxjs';
import { clearSagaSubscriptions } from '@/test/clear-saga-subscriptions';
import { v4 as uuid } from 'uuid';

describe('Cancel table booking - Table booking sage', () => {
  let testingModule: TestingModule;
  let app: INestApplication;
  let eventStoreDbService: EventStoreService;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockedConfigService)
      .compile();

    app = testingModule.createNestApplication();

    await clearSagaSubscriptions(app);

    await app.init();

    eventStoreDbService = app.get<EventStoreService>(EVENT_STORE_SERVICE);
  });

  afterAll(async () => {
    await app.close();
    await testingModule.close();
  });

  describe('When a booking is initiated and there is a lock failure', () => {
    const tableId = uuid();
    const bookingId = uuid();
    const correlationId = uuid();
    const timeSlot = {
      from: new Date(),
      to: new Date(),
    };

    beforeEach(async () => {
      const bookingInitiatedEvent = new TableBookingInitiatedEvent(
        {
          tableId: tableId,
          id: bookingId,
          timeSlot,
        },
        {
          correlationId,
        },
      );

      await eventStoreDbService.publish(bookingInitiatedEvent);

      const tableLockFailureEvent = new TableLockPlacementFailedEvent(
        tableId,
        timeSlot,
        'Table lock failure',
        correlationId,
      );

      await eventStoreDbService.publish(tableLockFailureEvent);
    });

    it('should cancel the booking', async () => {
      const source$ =
        await eventStoreDbService.initPersistentSubscriptionToStream(
          TableBookingBaseEvent.buildStreamName(tableId),
          `table-${tableId}-booking-confirmation`,
        );

      const tableBookingCancelledEvent = await firstValueFrom(
        source$.pipe(
          filter((event) => event.type === 'table-booking-cancelled'),
          take(1),
        ),
      );

      expect(tableBookingCancelledEvent.data).toEqual({
        id: bookingId,
        tableId,
        timeSlot: {
          from: timeSlot.from.toISOString(),
          to: timeSlot.to.toISOString(),
        },
      });
    });
  });
});
