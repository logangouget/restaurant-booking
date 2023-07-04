import { z } from "zod";
import { TimeSlot, timeSlotSchema } from "../time-slot";
import { TableBaseEvent } from "./table-base-event";
import { EventMetadata } from "../event";

export const tableLockPlacedSchema = z.object({
  id: z.string(),
  timeSlot: timeSlotSchema,
});

export type TableLockPlacedEventData = z.infer<typeof tableLockPlacedSchema>;

export class TableLockPlacedEvent extends TableBaseEvent<
  TableLockPlacedEventData,
  "table-lock-placed"
> {
  constructor(
    data: { id: string; timeSlot: TimeSlot },
    metadata?: EventMetadata
  ) {
    super({
      data,
      type: "table-lock-placed",
      version: 1,
      metadata,
    });
  }
}

export function parseTableLockPlacedEventData(
  data: unknown
): TableLockPlacedEventData {
  return tableLockPlacedSchema.parse(data);
}
