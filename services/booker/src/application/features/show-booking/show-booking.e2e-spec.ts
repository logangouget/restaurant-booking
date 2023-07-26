import { retryWithDelay } from '@/test/retry-with-delay';
import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common/interfaces';
import { TestingModule } from '@nestjs/testing';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import {
  TableAddedEvent,
  TableBookingConfirmedEvent,
  TableBookingInitiatedEvent,
  TableLockPlacedEvent,
} from '@rb/events';
import * as request from 'supertest';
import { v4 as uuid } from 'uuid';

describe('Show booking E2E - /booking/${bookingId} (GET)', () => {
  let testingModule: TestingModule;
  let app: INestApplication;
  let eventStoreService: EventStoreService;

  beforeEach(async () => {
    ({ testingModule, app } = await setupTestingModule({
      disableSagas: true,
    }));

    eventStoreService = app.get<EventStoreService>(EVENT_STORE_SERVICE);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  describe('Validation errors', () => {
    describe('When there is no booking id', () => {
      it('should return 404', async () => {
        await request(app.getHttpServer()).get('/bookings/').expect(404);
      });
    });

    describe('When booking does not exist', () => {
      it('should return 404', async () => {
        await request(app.getHttpServer())
          .get(`/bookings/${uuid()}`)
          .expect(404);
      });
    });
  });

  describe('When booking exists', () => {
    const tableId = uuid();
    const bookingId = uuid();

    const timeSlotFromDate = new Date('2023-01-01T12:00Z');
    const timeSlotToDate = new Date('2023-01-01T14:00Z');

    const timeSlot = {
      from: timeSlotFromDate,
      to: timeSlotToDate,
    };

    beforeEach(async () => {
      await bookTable({
        eventStoreService,
        bookingId,
        tableId,
        timeSlot,
        correlationId: bookingId,
      });
    });

    it('should return booking details', async () => {
      await retryWithDelay(
        async () => {
          const data = await request(app.getHttpServer()).get(
            `/bookings/${bookingId}`,
          );

          expect(data.body).toEqual({
            id: bookingId,
            tableId,
            timeSlot: {
              from: timeSlotFromDate.toISOString(),
              to: timeSlotToDate.toISOString(),
            },
            status: 'confirmed',
          });
        },
        {
          maxRetries: 4,
          delay: 1000,
        },
      );
    });
  });
});

async function bookTable({
  eventStoreService,
  tableId,
  bookingId,
  timeSlot,
  correlationId,
}: {
  eventStoreService: EventStoreService;
  tableId: string;
  bookingId: string;
  timeSlot: {
    from: Date;
    to: Date;
  };
  correlationId: string;
}) {
  await eventStoreService.publish(
    new TableAddedEvent({
      id: tableId,
      seats: 4,
    }),
  );

  await eventStoreService.publish(
    new TableBookingInitiatedEvent(
      {
        id: bookingId,
        tableId,
        timeSlot,
      },
      {
        correlationId,
      },
    ),
  );

  await eventStoreService.publish(
    new TableLockPlacedEvent(
      {
        id: tableId,
        timeSlot,
      },
      {
        correlationId,
      },
    ),
  );

  await eventStoreService.publish(
    new TableBookingConfirmedEvent(
      {
        id: bookingId,
        tableId,
        timeSlot,
      },
      {
        correlationId,
      },
    ),
  );
}
