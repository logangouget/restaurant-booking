import { z } from "zod";

export const timeSlotSchema = z.object({
  from: z.string().transform((date) => new Date(date)),
  to: z.string().transform((date) => new Date(date)),
});

export type TimeSlot = z.infer<typeof timeSlotSchema>;
