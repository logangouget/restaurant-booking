import { TableAddedEvent } from "./table-added-event";
import { TableLockPlacedEvent } from "./table-lock-placed-event";
import { TableLockRemovedEvent } from "./table-lock-removed-event";
import { TableRemovedEvent } from "./table-removed-event";

export * from "./table-added-event";
export * from "./table-removed-event";
export * from "./table-lock-placed-event";
export * from "./table-lock-placement-failed-event";

export type TableEvent =
  | TableAddedEvent
  | TableRemovedEvent
  | TableLockPlacedEvent
  | TableLockRemovedEvent;

export type TableEventType = TableEvent["type"];
