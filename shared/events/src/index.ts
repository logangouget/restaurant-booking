import { TableAddedEvent, TableRemovedEvent } from "./table";

export * from "./event";
export * from "./table";

export type TableEvent = TableAddedEvent | TableRemovedEvent;
