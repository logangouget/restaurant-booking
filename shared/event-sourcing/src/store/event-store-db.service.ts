import {
  EventStoreDBClient,
  jsonEvent,
  JSONEventType,
  JSONType,
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

  private mapEventToJsonEvent<T, X>(event: Event<T, X>) {
    return jsonEvent({
      type: event.type as string,
      data: event.data as JSONType,
    });
  }
}
