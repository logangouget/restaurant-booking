import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ListAvailableBookingSlotsQuery,
  ListAvailableBookingSlotsQueryResult,
} from './list-available-booking-slots.query';
import {
  DB,
  DbType,
} from '@/infrastructure/repository/database/database.module';
import { Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { bookings, tables } from '@/infrastructure/repository/database/schemas';

@QueryHandler(ListAvailableBookingSlotsQuery)
export class ListAvailableBookingSlotsHandler
  implements IQueryHandler<ListAvailableBookingSlotsQuery>
{
  constructor(
    @Inject(DB)
    private readonly db: DbType,
  ) {}

  async execute(
    query: ListAvailableBookingSlotsQuery,
  ): Promise<ListAvailableBookingSlotsQueryResult> {
    const startDate = query.startDate.toISOString().split('T')[0];
    const endDate = query.endDate.toISOString().split('T')[0];

    const rows: Array<{
      day: string;
      start_time: string;
      end_time: string;
      available_tables: string[];
    }> = await this.db.execute(
      sql`
      WITH date_range AS (
        SELECT
          ${startDate}::date AS start_date,
          ${endDate}::date AS end_date
      ),
      time_slots AS (
        SELECT
          generate_series(start_date, end_date, INTERVAL '1 day') AS day,
          '12:00'::time AS morning_start,
          '14:00'::time AS morning_end,
          '19:00'::time AS evening_start,
          '21:00'::time AS evening_end
        FROM
          date_range
      ),
      available_tables AS (
        SELECT
          ts.day,
          ts.morning_start AS start_time,
          ts.morning_end AS end_time,
          array_agg(${tables.id}) AS available_tables
        FROM
          time_slots ts
          CROSS JOIN ${tables}
          LEFT JOIN ${bookings} ON (
            ${bookings.tableId} = ${tables.id}
            AND ${bookings.status} != 'cancelled'
            AND ${bookings.timeSlotFrom} = (ts.day + ts.morning_start)::timestamp
            AND ${bookings.timeSlotTo} = (ts.day + ts.morning_end)::timestamp
          )
        WHERE
          ${tables.seats} >= ${query.people}
          AND ${bookings.id} IS NULL
        GROUP BY
          ts.day,
          ts.morning_start,
          ts.morning_end
        UNION ALL
        SELECT
          ts.day,
          ts.evening_start AS start_time,
          ts.evening_end AS end_time,
          array_agg(${tables.id}) AS available_tables
        FROM
          time_slots ts
          CROSS JOIN ${tables}
          LEFT JOIN ${bookings} ON (
            ${bookings.tableId} = ${tables.id}
            AND ${bookings.status} != 'cancelled'
            AND ${bookings.timeSlotFrom} = (ts.day + ts.evening_start)::timestamp
            AND ${bookings.timeSlotTo} = (ts.day + ts.evening_end)::timestamp
          )
        WHERE
          ${tables.seats} >= ${query.people}
          AND ${bookings.id} IS NULL
        GROUP BY
          ts.day,
          ts.evening_start,
          ts.evening_end
      )
      SELECT
        to_char(a.day, 'YYYY-MM-DD') AS day,
        to_char(a.start_time, 'HH24:MI') AS start_time,
        to_char(a.end_time, 'HH24:MI') AS end_time,
        a.available_tables
      FROM
        available_tables a
      ORDER BY
        a.day,
        a.start_time;
      `,
    );

    const availabilities = rows.reduce<
      ListAvailableBookingSlotsQueryResult['availabilities']
    >((acc, row) => {
      const day = acc.find((a) => a.day === row.day);

      if (day) {
        day.slots.push({
          startTime: row.start_time,
          endTime: row.end_time,
          availableTables: row.available_tables,
        });
        return acc;
      }

      acc.push({
        day: row.day,
        slots: [
          {
            startTime: row.start_time,
            endTime: row.end_time,
            availableTables: row.available_tables,
          },
        ],
      });

      return acc;
    }, []);

    return {
      startDate: query.startDate,
      endDate: query.endDate,
      people: query.people,
      availabilities,
    };
  }
}
