import { retryWithDelay } from '@/test/retry-with-delay';
import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common/interfaces';
import { TestingModule } from '@nestjs/testing';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import {
  TableAddedEvent,
  TableBookingInitiatedEvent,
  TableLockPlacedEvent,
} from '@rb/events';
import { TableBookingBaseEvent } from '@rb/events/dist/table-booking/table-booking-base-event';
import { firstValueFrom, toArray } from 'rxjs';
import * as request from 'supertest';
import { v4 as uuid } from 'uuid';

describe('List available booking slots E2E - /booking-slots (GET)', () => {
  let testingModule: TestingModule;
  let app: INestApplication;
  let eventStoreService: EventStoreService;

  beforeEach(async () => {
    ({ testingModule, app } = await setupTestingModule());

    eventStoreService = app.get<EventStoreService>(EVENT_STORE_SERVICE);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  describe('Validation errors', () => {
    describe('When startDate is missing', () => {
      it('should return 400', async () => {
        await request(app.getHttpServer())
          .get('/booking-slots')
          .query({
            endDate: '2023-01-01',
            people: 4,
          })
          .expect(400);
      });
    });

    describe('When startDate is invalid', () => {
      it('should return 400', async () => {
        await request(app.getHttpServer())
          .get('/booking-slots')
          .query({
            startDate: 'invalid',
            endDate: '2023-01-01',
            people: 4,
          })
          .expect(400);
      });
    });

    describe('When endDate is missing', () => {
      it('should return 400', async () => {
        await request(app.getHttpServer())
          .get('/booking-slots')
          .query({
            startDate: '2023-01-01',
            people: 4,
          })
          .expect(400);
      });
    });

    describe('When endDate is invalid', () => {
      it('should return 400', async () => {
        await request(app.getHttpServer())
          .get('/booking-slots')
          .query({
            startDate: '2023-01-01',
            endDate: 'invalid',
            people: 4,
          })
          .expect(400);
      });
    });

    describe('When there is too much time between startDate and endDate', () => {
      it('should return 400', async () => {
        await request(app.getHttpServer())
          .get('/booking-slots')
          .query({
            startDate: '2023-01-01',
            endDate: '2023-01-16',
            people: 4,
          })
          .expect(400);
      });
    });

    describe('When people is missing', () => {
      it('should return 400', async () => {
        await request(app.getHttpServer())
          .get('/booking-slots')
          .query({
            startDate: '2023-01-01',
            endDate: '2023-01-01',
          })
          .expect(400);
      });
    });
  });

  describe('When the morning slot for one day is not available', () => {
    const tableId = uuid();
    const bookingId = uuid();
    const correlationId = uuid();

    const timeSlotFromDate = new Date('2023-01-01T12:00Z');
    const timeSlotToDate = new Date('2023-01-01T14:00Z');

    const timeSlot = {
      from: timeSlotFromDate,
      to: timeSlotToDate,
    };

    beforeEach(async () => {
      await bookMorningSlot({
        eventStoreService,
        bookingId,
        tableId,
        timeSlot,
        correlationId,
      });
    });

    it('should only return evening slot', async () => {
      const data = await request(app.getHttpServer())
        .get('/booking-slots')
        .query({
          startDate: timeSlotFromDate.toISOString().split('T')[0],
          endDate: timeSlotToDate.toISOString().split('T')[0],
          people: 4,
        });

      expect(data.body).toHaveProperty(
        'availabilities',
        expect.arrayContaining([
          expect.objectContaining({
            day: timeSlotFromDate.toISOString().split('T')[0],
            slots: expect.arrayContaining([
              expect.objectContaining({
                availableTables: [tableId],
                startTime: '19:00',
                endTime: '21:00',
              }),
            ]),
          }),
        ]),
      );
      expect(data.body.availabilities[0].slots).toHaveLength(1);
    });
  });

  describe('When the evening slot for one is not available', () => {
    const tableId = uuid();
    const bookingId = uuid();
    const correlationId = uuid();

    const timeSlotFromDate = new Date('2023-01-01T19:00Z');
    const timeSlotToDate = new Date('2023-01-01T21:00Z');

    const timeSlot = {
      from: timeSlotFromDate,
      to: timeSlotToDate,
    };

    beforeEach(async () => {
      await bookMorningSlot({
        eventStoreService,
        bookingId,
        tableId,
        timeSlot,
        correlationId,
      });
    });

    it('should only return morning slot', async () => {
      const data = await request(app.getHttpServer())
        .get('/booking-slots')
        .query({
          startDate: timeSlotFromDate.toISOString().split('T')[0],
          endDate: timeSlotToDate.toISOString().split('T')[0],
          people: 4,
        });

      expect(data.body).toHaveProperty(
        'availabilities',
        expect.arrayContaining([
          expect.objectContaining({
            day: timeSlotFromDate.toISOString().split('T')[0],
            slots: expect.arrayContaining([
              expect.objectContaining({
                availableTables: [tableId],
                startTime: '12:00',
                endTime: '14:00',
              }),
            ]),
          }),
        ]),
      );
      expect(data.body.availabilities[0].slots).toHaveLength(1);
    });
  });
});

async function bookMorningSlot({
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

  await retryWithDelay(
    async () => {
      const tableBooking = eventStoreService.readStream(
        TableBookingBaseEvent.buildStreamName(tableId),
      );

      const events = await firstValueFrom(tableBooking.pipe(toArray()));

      const latestEvent = events[events.length - 1];

      expect(latestEvent.type).toEqual('table-booking-confirmed');
    },
    {
      maxRetries: 4,
      delay: 1000,
    },
  );
}
