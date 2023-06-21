import { Event } from "../event";

export abstract class TableBaseEvent<
  Data extends { id: string }, Type
> extends Event<Data, Type> {
  static STREAM_PREFIX = "table";

  constructor({
    data,
    type,
    version,
  }: {
    data: Data;
    type: Type;
    version: number;
  }) {
    super({
      data,
      type,
      version,
      streamName: TableBaseEvent.buildStreamName(data.id),
    });
  }

  static buildStreamName(id: string): string {
    return `${TableBaseEvent.STREAM_PREFIX}-${id}`;
  }
}
