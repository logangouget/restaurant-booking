import { getAllStreamEvents } from '@/test/get-all-stream-events';
import { getValidFutureTimeSlot } from '@/test/get-future-date';
import { retryWithDelay } from '@/test/retry-with-delay';
import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import {
  TableBookingConfirmedEvent,
  TableBookingInitiatedEvent,
  TableLockPlacedEvent,
} from '@rb/events';
import { TableBookingBaseEvent } from '@rb/events/dist/table-booking/table-booking-base-event';
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

  afterEach(async () => {
    await testingModule.close();
  });

  describe('When a table is locked and a booking is initiated', () => {
    const tableId = uuid();
    const bookingId = uuid();
    const timeSlot = getValidFutureTimeSlot();

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
      await retryWithDelay(
        async () => {
          const events = await getAllStreamEvents(
            eventStoreDbService,
            TableBookingBaseEvent.buildStreamName(bookingId),
          );

          const latestEvent = events[events.length - 1];

          expect(latestEvent.type).toEqual<TableBookingConfirmedEvent['type']>(
            'table-booking-confirmed',
          );

          expect(latestEvent.data).toMatchObject({
            id: bookingId,
            tableId: tableId,
            timeSlot: {
              from: timeSlot.from.toISOString(),
              to: timeSlot.to.toISOString(),
            },
          });
        },
        {
          delay: 1000,
        },
      );
    });
  });
});
