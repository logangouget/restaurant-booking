export class TableBookingNotFoundError extends Error {
  constructor(tableId: string, correlationId: string) {
    super(
      `Table booking with table id ${tableId} and correlationId ${correlationId} not found`,
    );
  }
}
