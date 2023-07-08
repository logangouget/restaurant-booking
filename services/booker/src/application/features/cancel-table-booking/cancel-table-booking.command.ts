export class CancelTableBookingCommand {
  constructor(
    public readonly tableId: string,
    public readonly correlationId: string,
  ) {}
}
