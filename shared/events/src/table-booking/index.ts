import { TableBookingConfirmedEvent } from "./table-booking-confirmed";
import { TableBookingInitiatedEvent } from "./table-booking-initiated";

export * from "./table-booking-initiated";
export * from "./table-booking-confirmed";

export type TableBookingEvent =
  | TableBookingInitiatedEvent
  | TableBookingConfirmedEvent;

export type TableBookingEventType = TableBookingEvent["type"];
