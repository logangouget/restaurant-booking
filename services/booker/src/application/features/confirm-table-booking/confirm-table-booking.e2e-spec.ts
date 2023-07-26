import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import { TableBookingInitiatedEvent, TableLockPlacedEvent } from '@rb/events';
import { TableBookingBaseEvent } from '@rb/events/dist/table-booking/table-booking-base-event';
import { filter, firstValueFrom, take } from 'rxjs';
import { v4 as uuid } from 'uuid';

describe('Confirm booking E2E - Table booking saga', () => {
  let testingModule: TestingModule;
  let app: INestApplication;
  let eventStoreDbService: EventStoreService;

  beforeEach(async () => {
    ({ testingModule, app } = await setupTestingModule({
      disableProjections: true,
    }));
    eventStoreDbService = app.get<EventStoreService>(EVENT_STORE_SERVICE);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  describe('When a table is locked and a booking is initiated', () => {
    const tableId = uuid();
    const bookingId = uuid();
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
          correlationId: bookingId,
        },
      );

      await eventStoreDbService.publish(bookingInitiatedEvent);

      const tableLockedEvent = new TableLockPlacedEvent(
        {
          id: tableId,
          timeSlot,
        },
        {
          correlationId: bookingId,
        },
      );

      await eventStoreDbService.publish(tableLockedEvent);
    });

    it('should confirm the booking', async () => {
      const source$ =
        await eventStoreDbService.initPersistentSubscriptionToStream(
          TableBookingBaseEvent.buildStreamName(bookingId),
          `booking-${bookingId}-booking-confirmation`,
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
