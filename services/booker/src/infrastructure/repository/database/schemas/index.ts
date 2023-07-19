import { relations } from 'drizzle-orm';
import {
  integer,
  pgEnum,
  pgSchema,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const bookerSchemaName = 'booker';
export const tablesTableName = 'tables';

export const bookerSchema = pgSchema(bookerSchemaName);

export const tables = bookerSchema.table(tablesTableName, {
  id: varchar('id', { length: 256 }).primaryKey(),
  seats: integer('seats'),
  removedAt: timestamp('removed_at'),
  revision: integer('revision'),
});

export const bookingStatusEnum = pgEnum('booking_status', [
  'initiated',
  'cancelled',
  'confirmed',
]);

export const bookingsTableName = 'bookings';

export const bookings = bookerSchema.table(bookingsTableName, {
  id: varchar('id', { length: 256 }).primaryKey(),
  timeSlotFrom: timestamp('time_slot_from'),
  timeSlotTo: timestamp('time_slot_to'),
  tableId: varchar('table_id', { length: 256 }).references(() => tables.id),
  status: bookingStatusEnum('booking_status'),
  revision: integer('revision'),
});

export const bookingsRelations = relations(bookings, ({ one }) => ({
  table: one(tables, {
    fields: [bookings.tableId],
    references: [tables.id],
  }),
}));
