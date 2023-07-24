export class TableBookingNotFoundError extends Error {
  constructor(tableId: string, correlationId?: string) {
    const message = correlationId
      ? `Table booking with table id ${tableId} and correlationId ${correlationId} not found`
      : `Table booking with table id ${tableId} not found`;

    super(message);
  }
}
