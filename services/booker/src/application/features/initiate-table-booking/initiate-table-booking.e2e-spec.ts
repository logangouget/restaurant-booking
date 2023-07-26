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

  afterAll(async () => {
    await testingModule.close();
  });

  describe('Initiate booking', () => {
    const tableId = uuid();

    it('should book a table', async () => {
      await request(app.getHttpServer())
        .post('/booking/initiate')
        .send({
          tableId: tableId,
          timeSlot: {
            from: getDate(1, 12),
            to: getDate(1, 14),
          },
        })
        .expect(201);
    });
  });

  describe('Initiate a table booking for a table that is already booked', () => {
    const tableId = uuid();

    const timeSlot = {
      from: getDate(1, 12),
      to: getDate(1, 14),
    };

    beforeAll(async () => {
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
          tableId: tableId,
          timeSlot,
        })
        .expect(409);
    });
  });
});

function getDate(daysFromToday: number, hours: number, min?: number): Date {
  const date = new Date(
    new Date().setDate(new Date().getDate() + daysFromToday),
  );

  date.setHours(hours, min ?? 0);

  return date;
}
