export class SlotUnavailableException extends Error {
  constructor(tableId: string) {
    super(`Slot not available for table ${tableId}`);
  }
}
