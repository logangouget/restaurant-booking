import { AppModule } from '@/app.module';
import { mockedConfigService } from '@/test/mocked-config-service';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import { TableBookingInitiatedEvent, TableLockPlacedEvent } from '@rb/events';
import { TableBookingBaseEvent } from '@rb/events/dist/table-booking/table-booking-base-event';
import { filter, firstValueFrom, take } from 'rxjs';
import { v4 as uuid } from 'uuid';

describe('Confirm booking E2E - Table booking saga', () => {
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
    await app.init();

    eventStoreDbService = app.get<EventStoreService>(EVENT_STORE_SERVICE);
  });

  afterAll(async () => {
    await app.close();
    await testingModule.close();
  });

  describe('When a table is locked and a booking is initiated', () => {
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

      const tableLockedEvent = new TableLockPlacedEvent(
        {
          id: tableId,
          timeSlot,
        },
        {
          correlationId,
        },
      );

      await eventStoreDbService.publish(tableLockedEvent);
    });

    it('should confirm the booking', async () => {
      const source$ =
        await eventStoreDbService.initPersistentSubscriptionToStream(
          TableBookingBaseEvent.buildStreamName(tableId),
          `table-${tableId}-booking-confirmation`,
        );

      const tableBookingConfirmedEvent = await firstValueFrom(
        source$.pipe(
          filter((event) => event.type === 'table-booking-confirmed'),
          take(1),
        ),
      );

      expect(tableBookingConfirmedEvent.data).toMatchObject({
        id: bookingId,
        tableId: tableId,
        timeSlot: {
          from: timeSlot.from.toISOString(),
          to: timeSlot.to.toISOString(),
        },
      });
    });
  });
});
