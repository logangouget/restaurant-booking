import { Event } from "../event";

export interface TableUpdatedEventData {
  id: string;
  seats: number;
}

export class TableUpdatedEvent extends Event<TableUpdatedEventData> {
  constructor(public readonly id: string, public readonly seats: number) {
    super({ id, seats }, "table-updated", 1);
  }
}
