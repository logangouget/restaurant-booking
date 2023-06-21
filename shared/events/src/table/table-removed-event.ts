import { TableBaseEvent } from "./table-base-event";

export interface TableRemovedEventData {
  id: string;
}

export class TableRemovedEvent extends TableBaseEvent<
  TableRemovedEventData,
  "table-removed"
> {
  constructor(public readonly id: string) {
    super({
      data: { id },
      type: "table-removed",
      version: 1,
    });
  }
}
