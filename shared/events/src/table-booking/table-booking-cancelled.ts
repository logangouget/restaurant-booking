import { z } from "zod";
import { TimeSlot, timeSlotSchema } from "../time-slot";
import { TableBookingBaseEvent } from "./table-booking-base-event";
import { EventMetadata } from "../event";

export const tableBookingCancelledSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  timeSlot: timeSlotSchema,
});

export type TableBookingCancelledEventData = z.infer<
  typeof tableBookingCancelledSchema
>;

export class TableBookingCancelledEvent extends TableBookingBaseEvent<
  TableBookingCancelledEventData,
  "table-booking-cancelled"
> {
  constructor(
    data: { id: string; tableId: string; timeSlot: TimeSlot },
    metadata?: EventMetadata
  ) {
    super({
      data,
      type: "table-booking-cancelled",
      version: 1,
      metadata,
    });
  }
}

export function parseTableBookingCancelledEventData(
  data: unknown
): TableBookingCancelledEventData {
  return tableBookingCancelledSchema.parse(data);
}
