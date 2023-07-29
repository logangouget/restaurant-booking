import { getAllStreamEvents } from '@/test/get-all-stream-events';
import { getValidFutureTimeSlot } from '@/test/get-future-date';
import { retryWithDelay } from '@/test/retry-with-delay';
import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import {
  TableBookingCancelledEvent,
  TableBookingConfirmedEvent,
  TableBookingInitiatedEvent,
  TableLockPlacementFailedEvent,
} from '@rb/events';
import { TableBookingBaseEvent } from '@rb/events/dist/table-booking/table-booking-base-event';
import * as request from 'supertest';
import { v4 as uuid } from 'uuid';

describe('Cancel table booking E2E', () => {
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

  describe('From table locking saga', () => {
    describe('When a booking is initiated and there is a lock failure', () => {
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

        const tableLockFailureEvent = new TableLockPlacementFailedEvent(
          tableId,
          timeSlot,
          'Table lock failure',
          bookingId,
        );

        await eventStoreDbService.publish(tableLockFailureEvent);
      });

      it('should cancel the booking', async () => {
        await retryWithDelay(
          async () => {
            const events = await getAllStreamEvents(
              eventStoreDbService,
              TableBookingBaseEvent.buildStreamName(bookingId),
            );

            const latestEvent = events[events.length - 1];

            expect(latestEvent.type).toEqual<
              TableBookingCancelledEvent['type']
            >('table-booking-cancelled');

            expect(latestEvent.data).toEqual({
              id: bookingId,
              tableId,
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

  describe('From cancel route', () => {
    describe('when booking is not found', () => {
      it('should return 404', async () => {
        const bookingId = uuid();

        await request(app.getHttpServer())
          .post(`/bookings/${bookingId}/cancel`)
          .expect(404);
      });
    });

    describe('When a booking is confirmed cancel route is called', () => {
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

        const bookingConfirmedEvent = new TableBookingConfirmedEvent(
          {
            id: bookingId,
            tableId,
            timeSlot,
          },
          {
            correlationId: bookingId,
          },
        );

        await eventStoreDbService.publish(bookingConfirmedEvent);
      });

      it('should cancel the booking', async () => {
        await request(app.getHttpServer())
          .post(`/bookings/${bookingId}/cancel`)
          .expect(200);
      });
    });
  });
});
