import { Type } from '@nestjs/common';
import { AggregateRoot, IEventHandler } from '@nestjs/cqrs';
import {
  TableAddedEvent,
  TableEvent,
  TableLockPlacedEvent,
  TableRemovedEvent,
} from '@rb/events';
import { InvalidTableIdException } from './exceptions';

export interface TimeSlot {
  from: Date;
  to: Date;
}

export class Table extends AggregateRoot<TableEvent> {
  public seats: number;
  public removed: boolean;
  public locks = new Array<TimeSlot>();

  constructor(public id: string) {
    if (id.length === 0) {
      throw new InvalidTableIdException(id);
    }

    super();
  }

  add(seats: number) {
    this.apply(
      new TableAddedEvent({
        id: this.id,
        seats,
      }),
    );
  }

  remove() {
    this.apply(new TableRemovedEvent(this.id));
  }

  placeLock(timeSlot: TimeSlot) {
    this.apply(
      new TableLockPlacedEvent({
        id: this.id,
        timeSlot,
      }),
    );
  }

  getUncommittedEvents(): TableEvent[] {
    return super.getUncommittedEvents() as TableEvent[];
  }

  private onTableAddedEvent(event: TableAddedEvent) {
    this.id = event.data.id;
    this.seats = event.data.seats;
  }

  private onTableRemovedEvent() {
    this.removed = true;
  }

  private onTableLockPlacedEvent(event: TableLockPlacedEvent) {
    this.locks.push(event.data.timeSlot);
  }

  protected getEventHandler<T extends TableEvent>(
    event: T,
  ): Type<IEventHandler<T>> {
    switch (event.type) {
      case 'table-added':
        return this.onTableAddedEvent.bind(this);
      case 'table-removed':
        return this.onTableRemovedEvent.bind(this);
      case 'table-lock-placed':
        return this.onTableLockPlacedEvent.bind(this);
    }
  }

  static fromEventsHistory(events: TableEvent[]) {
    const table = new Table(events[0].data.id);

    for (const event of events) {
      table.apply(event, true);
    }

    return table;
  }
}
