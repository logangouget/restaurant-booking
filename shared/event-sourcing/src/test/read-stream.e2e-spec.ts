import {
  EventStoreDBClient,
  jsonEvent,
  StreamNotFoundError,
} from '@eventstore/db-client';
import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom, lastValueFrom, toArray } from 'rxjs';
import { EventStoreModule } from '../store/event-store.module';
import {
  EventStoreDbService,
  EVENT_STORE_DB_CLIENT,
} from '../store/event-store-db.service';
import { deleteExistingStream } from './utils/delete-existing-stream';

describe('Read events from a stream', () => {
  let testingModule: TestingModule;
  let eventStoreDbService: EventStoreDbService;
  let eventStoreClient: EventStoreDBClient;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [EventStoreModule],
    }).compile();

    eventStoreDbService =
      testingModule.get<EventStoreDbService>(EventStoreDbService);

    eventStoreClient = testingModule.get<EventStoreDBClient>(
      EVENT_STORE_DB_CLIENT,
    );
  });

  afterAll(async () => {
    await eventStoreClient.dispose();
  });

  describe('When the stream does not exist', () => {
    const testStreamName = 'test-stream-1';

    beforeEach(async () => {
      await deleteExistingStream(eventStoreClient, testStreamName);
    });

    describe('When we want to check if the stream exists', () => {
      it('should return false', async () => {
        const exists = await eventStoreDbService.streamExists(testStreamName);

        expect(exists).toBe(false);
      });
    });

    describe('When we want to read the stream', () => {
      const testStreamName = 'test-stream-1';

      it('should return an error', async () => {
        const obs = eventStoreDbService.readStream(testStreamName);

        expect(firstValueFrom(obs)).rejects.toThrow(StreamNotFoundError);
      });
    });
  });

  describe('When the stream exists', () => {
    const testStreamName = 'test-stream-3';

    beforeAll(async () => {
      await deleteExistingStream(eventStoreClient, testStreamName);

      await eventStoreClient.appendToStream(testStreamName, [
        jsonEvent({ type: 'test-event', data: { foo: 'bar', event: 1 } }),
        jsonEvent({ type: 'test-event', data: { foo: 'bar', event: 2 } }),
        jsonEvent({ type: 'test-event', data: { foo: 'bar', event: 3 } }),
      ]);
    });

    it('should return the events', async () => {
      const $source = eventStoreDbService.readStream(testStreamName);

      const events = await lastValueFrom($source.pipe(toArray()));

      expect(events.length).toBe(3);
      expect(events[0].event.data).toEqual({ foo: 'bar', event: 1 });
      expect(events[1].event.data).toEqual({ foo: 'bar', event: 2 });
      expect(events[2].event.data).toEqual({ foo: 'bar', event: 3 });
    });
  });
});
