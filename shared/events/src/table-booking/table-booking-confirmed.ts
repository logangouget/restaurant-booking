import { z } from "zod";
import { TimeSlot, timeSlotSchema } from "../time-slot";
import { TableBookingBaseEvent } from "./table-booking-base-event";
import { EventMetadata } from "../event";

export const tableBookingConfirmedSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  timeSlot: timeSlotSchema,
});

export type TableBookingConfirmedEventData = z.infer<
  typeof tableBookingConfirmedSchema
>;

export class TableBookingConfirmedEvent extends TableBookingBaseEvent<
  TableBookingConfirmedEventData,
  "table-booking-confirmed"
> {
  constructor(
    data: { id: string; tableId: string; timeSlot: TimeSlot },
    metadata?: EventMetadata
  ) {
    super({
      data,
      type: "table-booking-confirmed",
      version: 1,
      metadata,
    });
  }
}

export function parseTableBookingConfirmedEventData(
  data: unknown
): TableBookingConfirmedEventData {
  return tableBookingConfirmedSchema.parse(data);
}
