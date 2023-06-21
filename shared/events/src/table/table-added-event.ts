import { TableBaseEvent } from "./table-base-event";

export interface TableAddedEventData {
  id: string;
  seats: number;
}

export class TableAddedEvent extends TableBaseEvent<TableAddedEventData, "table-added"> {
  constructor(public readonly id: string, public readonly seats: number) {
    super({
      data: { id, seats },
      type: "table-added",
      version: 1,
    });
  }
}
