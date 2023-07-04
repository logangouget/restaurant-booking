import { z } from "zod";
import { TimeSlot, timeSlotSchema } from "../time-slot";
import { TableBookingBaseEvent } from "./table-booking-base-event";
import { EventMetadata } from "../event";

export const tableBookingInitiatedSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  timeSlot: timeSlotSchema,
});

export type TableBookingInitiatedEventData = z.infer<
  typeof tableBookingInitiatedSchema
>;

export class TableBookingInitiatedEvent extends TableBookingBaseEvent<
  TableBookingInitiatedEventData,
  "table-booking-initiated"
> {
  constructor(
    data: { id: string; tableId: string; timeSlot: TimeSlot },
    metadata?: EventMetadata
  ) {
    super({
      data,
      type: "table-booking-initiated",
      version: 1,
      metadata,
    });
  }
}

export function parseTableBookingInitiatedEventData(
  data: unknown
): TableBookingInitiatedEventData {
  return tableBookingInitiatedSchema.parse(data);
}
