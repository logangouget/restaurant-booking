export class ConfirmTableBookingCommand {
  constructor(
    public readonly tableId: string,
    public readonly correlationId: string,
  ) {}
}
