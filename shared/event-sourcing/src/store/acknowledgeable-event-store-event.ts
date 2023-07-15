import { EventStoreEvent } from './event-store-event';

export class AcknowledgeableEventStoreEvent extends EventStoreEvent {
  public readonly retryCount?: number;
  public readonly revision?: number;
  public readonly createdAt?: Date;

  ack: () => Promise<void>;
  nack: (
    action: 'park' | 'retry' | 'skip' | 'stop',
    message: string,
  ) => Promise<void>;

  constructor(
    event: {
      data?: unknown;
      metadata?: unknown;
      type?: string;
      retryCount?: number;
      revision?: number;
      createdAt?: Date;
    },
    acknowledgement: {
      ack: () => Promise<void>;
      nack: (
        action: 'park' | 'retry' | 'skip' | 'stop',
        message: string,
      ) => Promise<void>;
    },
  ) {
    super(event);
    this.retryCount = event.retryCount;
    this.ack = acknowledgement.ack;
    this.nack = acknowledgement.nack;
    this.revision = event.revision;
    this.createdAt = event.createdAt;
  }
}
