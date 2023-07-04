import { z } from "zod";
import { TableBaseEvent } from "./table-base-event";

export const tableAddedEventDataSchema = z.object({
  id: z.string(),
  seats: z.number(),
});

export type TableAddedEventData = z.infer<typeof tableAddedEventDataSchema>;

export class TableAddedEvent extends TableBaseEvent<
  TableAddedEventData,
  "table-added"
> {
  constructor(data: { id: string; seats: number }) {
    super({
      data,
      type: "table-added",
      version: 1,
    });
  }
}

export function parseTableAddedEventData(data: unknown): TableAddedEventData {
  return tableAddedEventDataSchema.parse(data);
}
