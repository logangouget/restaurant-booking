import { Event } from "../event";

export interface TableRemovedEventData {
  id: string;
}

export class TableRemovedEvent extends Event<TableRemovedEventData> {
  constructor(public readonly id: string) {
    super({ id }, "table-removed", 1);
  }
}
