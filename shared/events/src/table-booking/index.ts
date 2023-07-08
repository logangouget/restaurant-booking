import { TableBookingCancelledEvent } from "./table-booking-cancelled";
import { TableBookingConfirmedEvent } from "./table-booking-confirmed";
import { TableBookingInitiatedEvent } from "./table-booking-initiated";

export * from "./table-booking-initiated";
export * from "./table-booking-confirmed";
export * from "./table-booking-cancelled";

export type TableBookingEvent =
  | TableBookingInitiatedEvent
  | TableBookingConfirmedEvent
  | TableBookingCancelledEvent;

export type TableBookingEventType = TableBookingEvent["type"];
