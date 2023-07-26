import { Event, EventMetadata } from "../event";

export abstract class TableBookingBaseEvent<
  Data extends { id: string },
  Type
> extends Event<Data, Type> {
  static STREAM_PREFIX = "table_booking";

  constructor({
    data,
    type,
    version,
    metadata,
  }: {
    data: Data;
    metadata?: EventMetadata;
    type: Type;
    version: number;
  }) {
    super({
      data,
      type,
      version,
      streamName: TableBookingBaseEvent.buildStreamName(data.id),
      metadata,
    });
  }

  static buildStreamName(id: string): string {
    return `${TableBookingBaseEvent.STREAM_PREFIX}-${id}`;
  }
}
