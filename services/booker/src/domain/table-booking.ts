import { Type } from '@nestjs/common';
import { AggregateRoot, IEventHandler } from '@nestjs/cqrs';
import {
  TableBookingCancelledEvent,
  TableBookingConfirmedEvent,
  TableBookingEvent,
  TableBookingInitiatedEvent,
} from '@rb/events';
import { v4 as uuid } from 'uuid';
import { TimeSlot } from './time-slot.value-object';
import { InvalidTimeSlotException } from './exceptions';

export class TableBooking extends AggregateRoot<TableBookingEvent> {
  public readonly id: string;
  public tableId: string;
  public timeSlot: TimeSlot;
  public status: 'idle' | 'initiated' | 'confirmed' | 'cancelled' = 'idle';

  constructor(id?: string) {
    super();
    this.id = id ?? uuid();
  }

  initiate(tableId: string, timeSlot: TimeSlot) {
    if (!timeSlot.isValid()) {
      throw new InvalidTimeSlotException();
    }

    this.apply(
      new TableBookingInitiatedEvent({
        id: this.id,
        tableId,
        timeSlot,
      }),
    );
  }

  confirm() {
    this.apply(
      new TableBookingConfirmedEvent({
        id: this.id,
        tableId: this.tableId,
        timeSlot: this.timeSlot,
      }),
    );
  }

  cancel() {
    this.apply(
      new TableBookingCancelledEvent({
        id: this.id,
        tableId: this.tableId,
        timeSlot: this.timeSlot,
      }),
    );
  }

  onTableBookingInitiatedEvent(event: TableBookingInitiatedEvent) {
    this.status = 'initiated';
    this.timeSlot = new TimeSlot(
      event.data.timeSlot.from,
      event.data.timeSlot.to,
    );
    this.tableId = event.data.tableId;
  }

  onTableBookingConfirmedEvent() {
    this.status = 'confirmed';
  }

  onTableBookingCancelledEvent() {
    this.status = 'cancelled';
  }

  protected getEventHandler<T extends TableBookingEvent>(
    event: T,
  ): Type<IEventHandler<T>> {
    switch (event.type) {
      case 'table-booking-initiated':
        return this.onTableBookingInitiatedEvent.bind(this);
      case 'table-booking-confirmed':
        return this.onTableBookingConfirmedEvent.bind(this);
      case 'table-booking-cancelled':
        return this.onTableBookingCancelledEvent.bind(this);
    }
  }

  static fromEventsHistory(events: TableBookingEvent[]) {
    const tableBooking = new TableBooking(events[0].data.id);

    for (const event of events) {
      tableBooking.apply(event, true);
    }

    return tableBooking;
  }
}
