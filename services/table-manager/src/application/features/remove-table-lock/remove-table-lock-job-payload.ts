export interface RemoveTableLockJobPayload {
  tableId: string;
  timeSlot: {
    from: string;
    to: string;
  };
  correlationId: string;
}
