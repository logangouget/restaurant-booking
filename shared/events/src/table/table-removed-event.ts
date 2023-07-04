import { z } from "zod";
import { TableBaseEvent } from "./table-base-event";

export const tableRemovedEventDataSchema = z.object({
  id: z.string(),
});

export type TableRemovedEventData = z.infer<typeof tableRemovedEventDataSchema>;

export class TableRemovedEvent extends TableBaseEvent<
  TableRemovedEventData,
  "table-removed"
> {
  constructor(public readonly id: string) {
    super({
      data: { id },
      type: "table-removed",
      version: 1,
    });
  }
}

export function parseTableRemovedEventData(
  data: unknown
): TableRemovedEventData {
  return tableRemovedEventDataSchema.parse(data);
}
