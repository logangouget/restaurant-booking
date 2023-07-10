import { Event } from '@rb/events';
import { Observable } from 'rxjs';
import { EventStoreEvent } from './event-store-event';
import { AcknowledgeableEventStoreEvent } from './acknowledgeable-event-store-event';

export const EVENT_STORE_SERVICE = 'EVENT_STORE_SERVICE';

export interface EventStoreService {
  publish<T, X>(event: Event<T, X>): Promise<void>;
  readStream(
    streamName: string,
    options?: {
      maxCount?: number;
    },
  ): Observable<EventStoreEvent>;
  streamExists(streamName: string): Promise<boolean>;
  initPersistentSubscriptionToStream(
    streamName: string,
    groupName: string,
  ): Promise<Observable<AcknowledgeableEventStoreEvent>>;
  closeClient(): Promise<void>;
}
