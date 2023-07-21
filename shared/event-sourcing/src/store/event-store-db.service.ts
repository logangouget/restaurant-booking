import {
  EventStoreDBClient,
  jsonEvent,
  JSONType,
  StreamNotFoundError,
} from '@eventstore/db-client';
import { Inject, Injectable } from '@nestjs/common';
import { Event } from '@rb/events';
import { firstValueFrom, Observable } from 'rxjs';
import { AcknowledgeableEventStoreEvent } from './acknowledgeable-event-store-event';
import { EventStoreEvent } from './event-store-event';
import { EventStoreService } from './event-store.service';

export const EVENT_STORE_DB_CLIENT = 'EVENT_STORE_DB_CLIENT';

@Injectable()
export class EventStoreDbService implements EventStoreService {
  constructor(
    @Inject(EVENT_STORE_DB_CLIENT)
    private readonly client: EventStoreDBClient,
  ) {}

  async publish<T, X>(event: Event<T, X>): Promise<void> {
    const jsonEvent = this.mapEventToJsonEvent(event);

    await this.client.appendToStream(event.streamName, jsonEvent);
  }

  readStream(
    streamName: string,
    options?: {
      maxCount?: number;
    },
  ): Observable<EventStoreEvent> {
    const stream = this.client.readStream(streamName, options);

    const observable = new Observable<EventStoreEvent>((subscriber) => {
      stream.on('data', (event) => {
        subscriber.next(
          new EventStoreEvent({
            data: event.event?.data,
            metadata: event.event?.metadata,
            type: event.event?.type,
          }),
        );
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
    });

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
  ): Promise<Observable<AcknowledgeableEventStoreEvent>> {
    const currentSubscriptions =
      await this.client.listAllPersistentSubscriptions();

    const existingSubscription = currentSubscriptions.find(
      (sub) => sub.groupName === groupName && sub.eventSource === streamName,
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
          extraStatistics: true,
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

    const observable = new Observable<AcknowledgeableEventStoreEvent>(
      (subscriber) => {
        persistentSubscription.on('data', (event) => {
          subscriber.next(
            new AcknowledgeableEventStoreEvent(
              {
                type: event.event?.type,
                data: event.event?.data,
                metadata: event.event?.metadata,
                retryCount: event.retryCount,
                revision: Number(event.event.revision),
                createdAt: event.event?.created,
              },
              {
                ack: () => persistentSubscription.ack(event),
                nack: (action, message) =>
                  persistentSubscription.nack(action, message, event),
              },
            ),
          );
        });

        persistentSubscription.on('error', (error) => {
          subscriber.error(error);
        });

        persistentSubscription.on('end', () => {
          subscriber.complete();
        });

        return () => {
          persistentSubscription.unsubscribe();
        };
      },
    );

    return observable;
  }

  private mapEventToJsonEvent<T, X>(event: Event<T, X>) {
    const { correlationId, ...metadata } = event.metadata ?? {};

    return jsonEvent({
      type: event.type as string,
      data: event.data as JSONType,
      metadata: {
        $correlationId: correlationId,
        ...metadata,
      },
    });
  }

  async closeClient() {
    return this.client.dispose();
  }
}
