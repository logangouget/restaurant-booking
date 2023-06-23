import {
  EventStoreDBClient,
  jsonEvent,
  JSONEventType,
  JSONType,
  PersistentSubscriptionToStreamResolvedEvent,
  ReadStreamOptions,
  ResolvedEvent,
  StreamNotFoundError,
} from '@eventstore/db-client';
import { Inject } from '@nestjs/common';
import { Event } from '@rb/events';
import { firstValueFrom, Observable } from 'rxjs';

export const EVENT_STORE_DB_CLIENT = 'EVENT_STORE_DB_CLIENT';

export class EventStoreDbService {
  constructor(
    @Inject(EVENT_STORE_DB_CLIENT) private readonly client: EventStoreDBClient,
  ) {}

  async publish<T, X>(event: Event<T, X>): Promise<void> {
    const jsonEvent = this.mapEventToJsonEvent(event);
    await this.client.appendToStream(event.streamName, jsonEvent);
  }

  readStream(
    streamName: string,
    options?: ReadStreamOptions,
  ): Observable<ResolvedEvent<JSONEventType>> {
    const stream = this.client.readStream(streamName, options);

    const observable = new Observable<ResolvedEvent<JSONEventType>>(
      (subscriber) => {
        stream.on('data', (event) => {
          subscriber.next(event);
        });

        stream.on('error', (error) => {
          subscriber.error(error);
        });

        stream.on('end', () => {
          subscriber.complete();
        });

        return () => {
          stream.cancel();
        };
      },
    );

    return observable;
  }

  async streamExists(streamName: string): Promise<boolean> {
    return firstValueFrom(
      this.readStream(streamName, { maxCount: 1 }).pipe((event) => event),
    )
      .then(() => true)
      .catch((error) => {
        if (error instanceof StreamNotFoundError) {
          return false;
        }
        throw error;
      });
  }

  async initPersistentSubscriptionToStream(
    streamName: string,
    groupName: string,
  ): Promise<
    Observable<PersistentSubscriptionToStreamResolvedEvent<JSONEventType>>
  > {
    const currentSubscriptions =
      await this.client.listAllPersistentSubscriptions();

    const existingSubscription = currentSubscriptions.find(
      (sub) => sub.groupName === groupName,
    );

    if (!existingSubscription) {
      await this.client.createPersistentSubscriptionToStream(
        streamName,
        groupName,
        {
          checkPointAfter: 2000,
          checkPointLowerBound: 10,
          checkPointUpperBound: 1000,
          consumerStrategyName: 'RoundRobin',
          extraStatistics: false,
          historyBufferSize: 500,
          liveBufferSize: 500,
          maxRetryCount: 10,
          maxSubscriberCount: 'unbounded',
          messageTimeout: 30000,
          readBatchSize: 20,
          resolveLinkTos: true,
          startFrom: 'start',
        },
      );
    }

    const persistentSubscription =
      this.client.subscribeToPersistentSubscriptionToStream(
        streamName,
        groupName,
      );

    const observable = new Observable<
      PersistentSubscriptionToStreamResolvedEvent<JSONEventType>
    >((subscriber) => {
      persistentSubscription.on('data', (event) => {
        subscriber.next(event);
      });

      persistentSubscription.on('error', (error) => {
        subscriber.error(error);
      });

      persistentSubscription.on('end', () => {
        subscriber.complete();
      });

      return () => {
        persistentSubscription.destroy();
      };
    });

    return observable;
  }

  private mapEventToJsonEvent<T, X>(event: Event<T, X>) {
    return jsonEvent({
      type: event.type as string,
      data: event.data as JSONType,
    });
  }
}
