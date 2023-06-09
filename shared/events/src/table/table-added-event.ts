import { Event } from "../event";

export interface TableAddedEventData {
  id: string;
  seats: number;
}

export class TableAddedEvent extends Event<TableAddedEventData> {
  constructor(public readonly id: string, public readonly seats: number) {
    super({ id, seats }, "table-added", 1);
  }
}
