export class EventStoreEvent {
  public readonly data?: unknown;
  public readonly metadata?: unknown;
  public readonly type?: string;

  constructor(event: { data?: unknown; metadata?: unknown; type?: string }) {
    this.data = event.data;
    this.metadata = event.metadata;
    this.type = event.type;
  }
}
