import { timeSlotConfiguration } from '@/domain/timeslot-configuration';
import {
  DB,
  DbType,
} from '@/infrastructure/repository/database/database.module';
import { bookings, tables } from '@/infrastructure/repository/database/schemas';
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { sql } from 'drizzle-orm';
import {
  ListAvailableBookingSlotsQuery,
  ListAvailableBookingSlotsQueryResult,
} from './list-available-booking-slots.query';

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

    const timeToPgTime = (hours: number, minutes: number) => {
      return sql.raw(`'${hours}:${minutes}'::time`);
    };

    const config = {
      morningStartTime: timeToPgTime(
        timeSlotConfiguration.morning.from.hours,
        timeSlotConfiguration.morning.from.minutes,
      ),

      morningEndTime: timeToPgTime(
        timeSlotConfiguration.morning.to.hours,
        timeSlotConfiguration.morning.to.minutes,
      ),
      eveningStartTime: timeToPgTime(
        timeSlotConfiguration.evening.from.hours,
        timeSlotConfiguration.evening.from.minutes,
      ),
      eveningEndTime: timeToPgTime(
        timeSlotConfiguration.evening.to.hours,
        timeSlotConfiguration.evening.to.minutes,
      ),
    };

    const timeZone = sql.raw(`'${timeSlotConfiguration.timezone}'`);

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
           ${config.morningStartTime} AS morning_start,
          ${config.morningEndTime} AS morning_end,
          ${config.eveningStartTime} AS evening_start,
          ${config.eveningEndTime} AS evening_end
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
            AND ${bookings.timeSlotFrom} = (ts.day + ts.morning_start)::timestamp AT TIME ZONE ${timeZone}
            AND ${bookings.timeSlotTo} = (ts.day + ts.morning_end)::timestamp AT TIME ZONE ${timeZone}
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
            AND ${bookings.timeSlotFrom} = (ts.day + ts.evening_start)::timestamp AT TIME ZONE ${timeZone}
            AND ${bookings.timeSlotTo} = (ts.day + ts.evening_end)::timestamp AT TIME ZONE ${timeZone}
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
      const daySlots = acc.find((a) => a.day === row.day);

      if (daySlots) {
        daySlots.slots.push({
          startTime: new Date(
            daySlots.day + 'T' + row.start_time,
          ).toISOString(),
          endTime: new Date(daySlots.day + 'T' + row.end_time).toISOString(),
          availableTables: row.available_tables,
        });
        return acc;
      }

      acc.push({
        day: row.day,
        slots: [
          {
            startTime: new Date(row.day + 'T' + row.start_time).toISOString(),
            endTime: new Date(row.day + 'T' + row.end_time).toISOString(),
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
