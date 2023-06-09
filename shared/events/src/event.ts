export class Event<T> {
  data: T;
  type: string;
  version: number;

  constructor(data: T, type: string, version: number) {
    this.data = data;
    this.type = type;
    this.version = version;
  }
}
