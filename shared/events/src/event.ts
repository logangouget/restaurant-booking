export interface EventMetadata {
  correlationId?: string;
}

export interface JSONMetadata {
  $correlationId?: string;
}

export class Event<Data, Type> {
  data: Data;
  metadata: EventMetadata;
  type: Type;
  version: number;
  streamName: string;

  constructor({
    data,
    type,
    version,
    streamName,
    metadata,
  }: {
    data: Data;
    metadata?: {
      correlationId?: string;
    };
    type: Type;
    version: number;
    streamName: string;
  }) {
    this.data = data;
    this.type = type;
    this.version = version;
    this.streamName = streamName;
    this.metadata = metadata ?? {};
  }

  setCorrelationId(correlationId: string) {
    this.metadata.correlationId = correlationId;
  }
}
