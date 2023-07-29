import { getValidFutureTimeSlot } from '@/test/get-future-date';
import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common/interfaces';
import { TestingModule } from '@nestjs/testing';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import { TableBookingInitiatedEvent, TableLockPlacedEvent } from '@rb/events';
import * as request from 'supertest';
import { v4 as uuid } from 'uuid';

describe('Book table E2E - /bookings/initiate (POST)', () => {
  let testingModule: TestingModule;
  let app: INestApplication;
  let eventStoreService: EventStoreService;

  beforeEach(async () => {
    ({ testingModule, app } = await setupTestingModule({
      disableProjections: true,
    }));
    eventStoreService = app.get<EventStoreService>(EVENT_STORE_SERVICE);
  });

  afterEach(async () => {
    await testingModule.close();
  });

  describe('Validation errors', () => {
    it('should return 400 when tableId is missing', async () => {
      await request(app.getHttpServer())
        .post('/booking/initiate')
        .send({
          timeSlot: {
            from: getValidFutureTimeSlot().from,
            to: getValidFutureTimeSlot().to,
          },
        })
        .expect(400);
    });

    it('should return 400 when timeSlot is missing', async () => {
      await request(app.getHttpServer())
        .post('/booking/initiate')
        .send({
          tableId: uuid(),
        })
        .expect(400);
    });

    it('should return 400 when timeSlot.from is missing', async () => {
      await request(app.getHttpServer())
        .post('/booking/initiate')
        .send({
          tableId: uuid(),
          timeSlot: {
            to: getValidFutureTimeSlot().to,
          },
        })
        .expect(400);
    });

    it('should return 400 when timeSlot.to is missing', async () => {
      await request(app.getHttpServer())
        .post('/booking/initiate')
        .send({
          tableId: uuid(),
          timeSlot: {
            from: getValidFutureTimeSlot().from,
          },
        })
        .expect(400);
    });

    it('should return 400 when timeSlot.from is not a valid date', async () => {
      await request(app.getHttpServer())
        .post('/booking/initiate')
        .send({
          tableId: uuid(),
          timeSlot: {
            from: 'not-a-date',
            to: getValidFutureTimeSlot().to,
          },
        })
        .expect(400);
    });

    it('should return 400 when timeSlot.to is not a valid date', async () => {
      await request(app.getHttpServer())
        .post('/booking/initiate')
        .send({
          tableId: uuid(),
          timeSlot: {
            from: getValidFutureTimeSlot().from,
            to: 'not-a-date',
          },
        })
        .expect(400);
    });
  });

  describe('Initiate booking', () => {
    const tableId = uuid();

    it('should book a table', async () => {
      await request(app.getHttpServer())
        .post('/booking/initiate')
        .send({
          tableId: tableId,
          timeSlot: getValidFutureTimeSlot(),
        })
        .expect(201);
    });
  });

  describe('Initiate a table booking for a table that is already booked', () => {
    const tableId = uuid();

    const timeSlot = getValidFutureTimeSlot();

    beforeEach(async () => {
      const bookingId = uuid();

      await eventStoreService.publish(
        new TableBookingInitiatedEvent({
          tableId: tableId,
          id: bookingId,
          timeSlot,
        }),
      );

      await eventStoreService.publish(
        new TableLockPlacedEvent(
          {
            id: tableId,
            timeSlot,
          },
          {
            correlationId: bookingId,
          },
        ),
      );
    });

    it('should return 400', async () => {
      await request(app.getHttpServer())
        .post('/booking/initiate')
        .send({
          tableId,
          timeSlot,
        })
        .expect(409);
    });
  });
});
