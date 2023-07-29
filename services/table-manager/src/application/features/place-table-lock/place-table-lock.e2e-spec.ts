import { getAllStreamEvents } from '@/test/get-all-stream-events';
import { retryWithDelay } from '@/test/retry-with-delay';
import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import {
  TableBookingInitiatedEvent,
  TableLockPlacementFailedEvent,
} from '@rb/events';
import { TableBaseEvent } from '@rb/events/dist/table/table-base-event';
import * as request from 'supertest';
import { v4 as uuid } from 'uuid';

describe('Place table lock E2E - Table locking saga', () => {
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

  describe('When a booking is initiated for a table', () => {
    describe('And the table exists', () => {
      const tableId = uuid();
      const correlationId = uuid();
      const timeSlot = {
        from: new Date(),
        to: new Date(),
      };

      beforeEach(async () => {
        await request(app.getHttpServer())
          .post('/tables')
          .send({ id: tableId, seats: 4 })
          .expect(201);

        const event = new TableBookingInitiatedEvent(
          {
            tableId,
            id: uuid(),
            timeSlot,
          },
          {
            correlationId: correlationId,
          },
        );

        await eventStoreDbService.publish(event);
      });

      it('should lock the table', async () => {
        await retryWithDelay(async () => {
          const events = await getAllStreamEvents(
            eventStoreDbService,
            TableBaseEvent.buildStreamName(tableId),
          );

          const latestEvent = events[events.length - 1];

          expect(latestEvent.data).toMatchObject({
            id: tableId,
            timeSlot: {
              from: timeSlot.from.toISOString(),
              to: timeSlot.to.toISOString(),
            },
          });

          expect(latestEvent.metadata).toMatchObject({
            $correlationId: correlationId,
          });
        });
      });
    });

    describe('And the table does not exist', () => {
      const tableId = uuid();
      const correlationId = uuid();
      const timeSlot = {
        from: new Date(),
        to: new Date(),
      };

      beforeEach(async () => {
        const event = new TableBookingInitiatedEvent(
          {
            tableId: tableId,
            id: uuid(),
            timeSlot,
          },
          {
            correlationId,
          },
        );

        await eventStoreDbService.publish(event);
      });

      it('should not lock the table and emit a failure', async () => {
        await retryWithDelay(async () => {
          const events = await getAllStreamEvents(
            eventStoreDbService,
            TableLockPlacementFailedEvent.STREAM_NAME,
          );

          const latestEvent = events[events.length - 1];

          expect(latestEvent.data).toMatchObject({
            tableId,
            timeSlot: {
              from: timeSlot.from.toISOString(),
              to: timeSlot.to.toISOString(),
            },
          });

          expect(latestEvent.metadata).toMatchObject({
            $correlationId: correlationId,
          });
        });
      });
    });
  });
});
