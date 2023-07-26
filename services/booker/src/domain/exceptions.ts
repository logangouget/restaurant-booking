export class SlotUnavailableException extends Error {
  constructor(tableId: string) {
    super(`Slot not available for table ${tableId}`);
  }
}

export class InvalidTimeSlotException extends Error {
  constructor() {
    super(`Invalid time slot`);
  }
}
