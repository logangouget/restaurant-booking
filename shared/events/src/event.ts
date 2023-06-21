export class Event<Data, Type> {
  data: Data;
  type: Type;
  version: number;
  streamName: string;

  constructor({
    data,
    type,
    version,
    streamName,
  }: {
    data: Data;
    type: Type;
    version: number;
    streamName: string;
  }) {
    this.data = data;
    this.type = type;
    this.version = version;
    this.streamName = streamName;
  }
}
