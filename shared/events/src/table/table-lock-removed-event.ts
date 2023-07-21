import { z } from "zod";
import { TimeSlot, timeSlotSchema } from "../time-slot";
import { TableBaseEvent } from "./table-base-event";
import { EventMetadata } from "../event";

export const tableLockRemovedSchema = z.object({
  id: z.string(),
  timeSlot: timeSlotSchema,
});

export type TableLockRemovedEventData = z.infer<typeof tableLockRemovedSchema>;

export class TableLockRemovedEvent extends TableBaseEvent<
  TableLockRemovedEventData,
  "table-lock-removed"
> {
  constructor(
    data: { id: string; timeSlot: TimeSlot },
    metadata?: EventMetadata
  ) {
    super({
      data,
      type: "table-lock-removed",
      version: 1,
      metadata,
    });
  }
}

export function parseTableLockRemovedEventData(
  data: unknown
): TableLockRemovedEventData {
  return tableLockRemovedSchema.parse(data);
}
