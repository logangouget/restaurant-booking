import { EventStoreDBClient } from '@eventstore/db-client';
import { Test, TestingModule } from '@nestjs/testing';
import { Event } from '@rb/events';
import { EventStoreModule } from '../store/event-store.module';
import {
  EventStoreDbService,
  EVENT_STORE_DB_CLIENT,
} from '../store/event-store-db.service';
import { deleteExistingStream } from './utils/delete-existing-stream';
import { streamToPromise } from './utils/read-stream-promise';

describe('Publish an event to a stream', () => {
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

    await deleteExistingStream(eventStoreClient, testStreamName);
  });

  afterAll(async () => {
    await eventStoreClient.dispose();
  });

  const testStreamName = 'test-stream-1';

  const event = new Event({
    data: {
      foo: 'bar',
    },
    type: 'test-event',
    streamName: testStreamName,
    version: 1,
  });

  it('should be able to publish an event', async () => {
    await eventStoreDbService.publish(event);

    const stream = eventStoreClient.readStream(testStreamName);
    const events = await streamToPromise(stream);

    expect(events.length).toBe(1);
    expect(events[0].event.type).toBe(event.type);
    expect(events[0].event.data).toEqual(event.data);
  });
});
