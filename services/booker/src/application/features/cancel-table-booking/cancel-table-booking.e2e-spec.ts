import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import {
  TableBookingConfirmedEvent,
  TableBookingInitiatedEvent,
  TableLockPlacementFailedEvent,
} from '@rb/events';
import { TableBookingBaseEvent } from '@rb/events/dist/table-booking/table-booking-base-event';
import { filter, firstValueFrom, take } from 'rxjs';
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

  afterAll(async () => {
    await testingModule.close();
  });

  describe('From table locking saga', () => {
    describe('When a booking is initiated and there is a lock failure', () => {
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

        const tableLockFailureEvent = new TableLockPlacementFailedEvent(
          tableId,
          timeSlot,
          'Table lock failure',
          bookingId,
        );

        await eventStoreDbService.publish(tableLockFailureEvent);
      });

      it('should cancel the booking', async () => {
        const source$ =
          await eventStoreDbService.initPersistentSubscriptionToStream(
            TableBookingBaseEvent.buildStreamName(bookingId),
            `booking-${bookingId}-booking-confirmation`,
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
