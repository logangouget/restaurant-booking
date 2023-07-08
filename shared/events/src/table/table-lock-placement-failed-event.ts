import { z } from "zod";
import { Event } from "../event";
import { TimeSlot, timeSlotSchema } from "../time-slot";

export const tableLockPlacementFailedEventDataSchema = z.object({
  tableId: z.string(),
  timeSlot: timeSlotSchema,
  reason: z.string(),
});

export type TableLockPlacementFailedEventData = z.infer<
  typeof tableLockPlacementFailedEventDataSchema
>;

export class TableLockPlacementFailedEvent extends Event<
  TableLockPlacementFailedEventData,
  "table-lock-placement-failed"
> {
  static STREAM_NAME = "table_lock_failure";

  constructor(
    tableId: string,
    timeSlot: TimeSlot,
    reason: string,
    correlationId: string
  ) {
    super({
      data: {
        tableId,
        timeSlot,
        reason,
      },
      streamName: TableLockPlacementFailedEvent.STREAM_NAME,
      type: "table-lock-placement-failed",
      version: 1,
      metadata: {
        correlationId,
      },
    });
  }
}

export function parseTableLockPlacementFailedEventData(
  data: unknown
): TableLockPlacementFailedEventData {
  return tableLockPlacementFailedEventDataSchema.parse(data);
}
