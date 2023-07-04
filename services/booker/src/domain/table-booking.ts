import { Type } from '@nestjs/common';
import { AggregateRoot, IEventHandler } from '@nestjs/cqrs';
import {
  TableBookingConfirmedEvent,
  TableBookingEvent,
  TableBookingInitiatedEvent,
} from '@rb/events';
import { v4 as uuid } from 'uuid';

export interface TimeSlot {
  from: Date;
  to: Date;
}

export class TableBooking extends AggregateRoot<TableBookingEvent> {
  public readonly id: string;
  public tableId: string;
  public timeSlot: TimeSlot;
  public status: 'idle' | 'initiated' | 'confirmed' = 'idle';

  constructor(id?: string) {
    super();
    this.id = id ?? uuid();
  }

  initiate(tableId: string, timeSlot: TimeSlot) {
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

  onTableBookingInitiatedEvent(event: TableBookingInitiatedEvent) {
    this.status = 'initiated';
    this.timeSlot = event.data.timeSlot;
    this.tableId = event.data.tableId;
  }

  onTableBookingConfirmedEvent() {
    this.status = 'confirmed';
  }

  protected getEventHandler<T extends TableBookingEvent>(
    event: T,
  ): Type<IEventHandler<T>> {
    switch (event.type) {
      case 'table-booking-initiated':
        return this.onTableBookingInitiatedEvent.bind(this);
      case 'table-booking-confirmed':
        return this.onTableBookingConfirmedEvent.bind(this);
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
