import { EventStoreDBClient, jsonEvent } from '@eventstore/db-client';
import { Test, TestingModule } from '@nestjs/testing';
import { lastValueFrom, take, toArray } from 'rxjs';
import {
  EVENT_STORE_DB_CLIENT,
  EventStoreDbService,
  EventStoreModule,
} from '../store';
import { defaultPersistentSubscriptionSettings } from './settings';
import { deleteExistingPersistentSubscription } from './utils/delete-existing-persistent-subscription';
import { deleteExistingStream } from './utils/delete-existing-stream';
import { delay } from './utils/delay';

describe('InitPersistentSubscription', () => {
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

  describe('Subscription creation', () => {
    describe('When subscription does not exist', () => {
      const testStreamName = 'test-stream-1';
      const testGroupName = 'test-persub-1';

      beforeAll(async () => {
        await deleteExistingPersistentSubscription(
          eventStoreClient,
          testStreamName,
          testGroupName,
        );
      });

      it('should create subscription', async () => {
        await eventStoreDbService.initPersistentSubscriptionToStream(
          testStreamName,
          testGroupName,
        );

        const currentSubscriptions =
          await eventStoreClient.listAllPersistentSubscriptions();

        const existingTest = currentSubscriptions.find(
          (sub) => sub.groupName === testGroupName,
        );

        expect(existingTest).toBeDefined();
      });
    });

    describe('When subscription exists', () => {
      const testStreamName = 'test-stream-2';
      const testGroupName = 'test-persub-2';

      beforeAll(async () => {
        await deleteExistingPersistentSubscription(
          eventStoreClient,
          testStreamName,
          testGroupName,
        );

        await eventStoreClient.createPersistentSubscriptionToStream(
          testStreamName,
          testGroupName,
          defaultPersistentSubscriptionSettings,
        );
      });

      it('should not keep created subscription', async () => {
        await eventStoreDbService.initPersistentSubscriptionToStream(
          testStreamName,
          testGroupName,
        );

        const currentSubscriptions =
          await eventStoreClient.listAllPersistentSubscriptions();

        const existingTest = currentSubscriptions.find(
          (sub) => sub.groupName === testGroupName,
        );

        expect(existingTest).toBeDefined();
      });
    });
  });

  describe('Receiving events', () => {
    describe('When subscription already exists and events are already published', () => {
      const testStreamName = 'test-stream-3';
      const testGroupName = 'test-persub-3';

      beforeAll(async () => {
        await deleteExistingStream(eventStoreClient, testStreamName);

        await deleteExistingPersistentSubscription(
          eventStoreClient,
          testStreamName,
          testGroupName,
        );

        await eventStoreClient.createPersistentSubscriptionToStream(
          testStreamName,
          testGroupName,
          defaultPersistentSubscriptionSettings,
        );

        await eventStoreClient.appendToStream(testStreamName, [
          jsonEvent({ type: 'test-event', data: { foo: 'bar', event: 1 } }),
          jsonEvent({ type: 'test-event', data: { foo: 'bar', event: 2 } }),
          jsonEvent({ type: 'test-event', data: { foo: 'bar', event: 3 } }),
        ]);
      });

      it('should receive events', async () => {
        const { source$ } =
          await eventStoreDbService.initPersistentSubscriptionToStream(
            testStreamName,
            testGroupName,
          );

        const events = await lastValueFrom(source$.pipe(take(3), toArray()));

        expect(events).toHaveLength(3);
        expect(events[0].event.data).toEqual({ foo: 'bar', event: 1 });
        expect(events[1].event.data).toEqual({ foo: 'bar', event: 2 });
        expect(events[2].event.data).toEqual({ foo: 'bar', event: 3 });
      });
    });

    describe('When subscription already exists and events are published after subscription', () => {
      const testStreamName = 'test-stream-4';
      const testGroupName = 'test-persub-4';

      beforeAll(async () => {
        await deleteExistingStream(eventStoreClient, testStreamName);

        await deleteExistingPersistentSubscription(
          eventStoreClient,
          testStreamName,
          testGroupName,
        );

        await eventStoreClient.createPersistentSubscriptionToStream(
          testStreamName,
          testGroupName,
          defaultPersistentSubscriptionSettings,
        );
      });

      it('should receive events published after subscription', async () => {
        const { source$ } =
          await eventStoreDbService.initPersistentSubscriptionToStream(
            testStreamName,
            testGroupName,
          );

        const events = [];

        source$.subscribe((event) => {
          events.push(event);
        });

        await eventStoreClient.appendToStream(testStreamName, [
          jsonEvent({ type: 'test-event', data: { foo: 'bar', event: 1 } }),
          jsonEvent({ type: 'test-event', data: { foo: 'bar', event: 2 } }),
          jsonEvent({ type: 'test-event', data: { foo: 'bar', event: 3 } }),
        ]);

        await delay(1000); // Wait for events to be received

        expect(events).toHaveLength(3);
        expect(events[0].event.data).toEqual({ foo: 'bar', event: 1 });
        expect(events[1].event.data).toEqual({ foo: 'bar', event: 2 });
        expect(events[2].event.data).toEqual({ foo: 'bar', event: 3 });
      });
    });
  });
});
