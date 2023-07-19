import {
  DB,
  DbType,
} from '@/infrastructure/repository/database/database.module';
import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { ListAvailableBookingSlotsHandler } from './list-available-booking-slots.handler';
import { bookings, tables } from '@/infrastructure/repository/database/schemas';
import { ListAvailableBookingSlotsQueryResult } from './list-available-booking-slots.query';

describe('ListAvailableBookingSlotsHandler database integration', () => {
  let testingModule: TestingModule;
  let app: INestApplication;
  let db: DbType;
  let listAvailableBookingSlotsHandler: ListAvailableBookingSlotsHandler;

  beforeEach(async () => {
    ({ testingModule, app } = await setupTestingModule({
      disableProjections: true,
      disableSagas: true,
    }));
    db = app.get(DB);
    listAvailableBookingSlotsHandler = app.get(
      ListAvailableBookingSlotsHandler,
    );
  });

  afterAll(async () => {
    await testingModule.close();
  });

  describe('When there are no bookings for a day', () => {
    beforeEach(async () => {
      await db.insert(tables).values({
        id: 'table1',
        revision: 0,
        seats: 4,
      });
    });

    it('should return available slots for that day', async () => {
      const result = await listAvailableBookingSlotsHandler.execute({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 4,
      });

      expect(result).toEqual<ListAvailableBookingSlotsQueryResult>({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 4,
        availabilities: [
          {
            day: '2023-01-01',
            slots: [
              {
                startTime: '12:00',
                endTime: '14:00',
                availableTables: ['table1'],
              },
              {
                startTime: '19:00',
                endTime: '21:00',
                availableTables: ['table1'],
              },
            ],
          },
        ],
      });
    });
  });

  describe('When there are bookings for a day', () => {
    beforeEach(async () => {
      await db.insert(tables).values({
        id: 'table1',
        revision: 0,
        seats: 4,
      });

      await db.insert(bookings).values({
        id: 'booking1',
        revision: 0,
        tableId: 'table1',
        status: 'confirmed',
        timeSlotFrom: new Date('2023-01-01:12:00Z'),
        timeSlotTo: new Date('2023-01-01:14:00Z'),
      });
    });

    it('should return available slots for that day', async () => {
      const result = await listAvailableBookingSlotsHandler.execute({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 4,
      });

      expect(result).toEqual<ListAvailableBookingSlotsQueryResult>({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 4,
        availabilities: [
          {
            day: '2023-01-01',
            slots: [
              {
                startTime: '19:00',
                endTime: '21:00',
                availableTables: ['table1'],
              },
            ],
          },
        ],
      });
    });
  });

  describe('When there are no slots available for a day', () => {
    beforeEach(async () => {
      await db.insert(tables).values({
        id: 'table1',
        revision: 0,
        seats: 4,
      });

      await db.insert(bookings).values({
        id: 'booking1',
        revision: 0,
        tableId: 'table1',
        status: 'confirmed',
        timeSlotFrom: new Date('2023-01-01:12:00Z'),
        timeSlotTo: new Date('2023-01-01:14:00Z'),
      });

      await db.insert(bookings).values({
        id: 'booking2',
        revision: 0,
        tableId: 'table1',
        status: 'confirmed',
        timeSlotFrom: new Date('2023-01-01:19:00Z'),
        timeSlotTo: new Date('2023-01-01:21:00Z'),
      });
    });

    it('should return available slots for that day', async () => {
      const result = await listAvailableBookingSlotsHandler.execute({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 4,
      });

      expect(result).toEqual<ListAvailableBookingSlotsQueryResult>({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 4,
        availabilities: [],
      });
    });
  });

  describe('When a table booking has been cancelled', () => {
    beforeEach(async () => {
      await db.insert(tables).values({
        id: 'table1',
        revision: 0,
        seats: 4,
      });

      await db.insert(bookings).values({
        id: 'booking1',
        revision: 0,
        tableId: 'table1',
        status: 'cancelled',
        timeSlotFrom: new Date('2023-01-01:12:00Z'),
        timeSlotTo: new Date('2023-01-01:14:00Z'),
      });
    });

    it('should appears as available', async () => {
      const result = await listAvailableBookingSlotsHandler.execute({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 4,
      });

      expect(result).toEqual<ListAvailableBookingSlotsQueryResult>({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 4,
        availabilities: [
          {
            day: '2023-01-01',
            slots: [
              {
                startTime: '12:00',
                endTime: '14:00',
                availableTables: ['table1'],
              },
              {
                startTime: '19:00',
                endTime: '21:00',
                availableTables: ['table1'],
              },
            ],
          },
        ],
      });
    });
  });

  describe('When there are more than one table and one is booked', () => {
    beforeEach(async () => {
      await db.insert(tables).values({
        id: 'table1',
        revision: 0,
        seats: 4,
      });

      await db.insert(tables).values({
        id: 'table2',
        revision: 0,
        seats: 4,
      });

      await db.insert(bookings).values({
        id: 'booking1',
        revision: 0,
        tableId: 'table1',
        status: 'confirmed',
        timeSlotFrom: new Date('2023-01-01:12:00Z'),
        timeSlotTo: new Date('2023-01-01:14:00Z'),
      });
    });

    it('should return other table as available', async () => {
      const result = await listAvailableBookingSlotsHandler.execute({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 4,
      });

      expect(result).toEqual<ListAvailableBookingSlotsQueryResult>({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 4,
        availabilities: [
          {
            day: '2023-01-01',
            slots: [
              {
                startTime: '12:00',
                endTime: '14:00',
                availableTables: ['table2'],
              },
              {
                startTime: '19:00',
                endTime: '21:00',
                availableTables: ['table1', 'table2'],
              },
            ],
          },
        ],
      });
    });
  });

  describe('When there are available tables but not enough seats', () => {
    beforeEach(async () => {
      await db.insert(tables).values({
        id: 'table1',
        revision: 0,
        seats: 2,
      });

      await db.insert(tables).values({
        id: 'table2',
        revision: 0,
        seats: 2,
      });
    });

    it('should not return any slots', async () => {
      const result = await listAvailableBookingSlotsHandler.execute({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 4,
      });

      expect(result).toEqual<ListAvailableBookingSlotsQueryResult>({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 4,
        availabilities: [],
      });
    });
  });

  describe('When multiple days are requested', () => {
    beforeEach(async () => {
      await db.insert(tables).values({
        id: 'table1',
        revision: 0,
        seats: 2,
      });

      await db.insert(tables).values({
        id: 'table2',
        revision: 0,
        seats: 2,
      });
    });

    it('should return slots for each day', async () => {
      const result = await listAvailableBookingSlotsHandler.execute({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-02'),
        people: 2,
      });

      expect(result).toEqual<ListAvailableBookingSlotsQueryResult>({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-02'),
        people: 2,
        availabilities: [
          {
            day: '2023-01-01',
            slots: [
              {
                startTime: '12:00',
                endTime: '14:00',
                availableTables: ['table1', 'table2'],
              },
              {
                startTime: '19:00',
                endTime: '21:00',
                availableTables: ['table1', 'table2'],
              },
            ],
          },
          {
            day: '2023-01-02',
            slots: [
              {
                startTime: '12:00',
                endTime: '14:00',
                availableTables: ['table1', 'table2'],
              },
              {
                startTime: '19:00',
                endTime: '21:00',
                availableTables: ['table1', 'table2'],
              },
            ],
          },
        ],
      });
    });
  });

  describe('When there are no tables', () => {
    it('should not return any slots', async () => {
      const result = await listAvailableBookingSlotsHandler.execute({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 2,
      });

      expect(result).toEqual<ListAvailableBookingSlotsQueryResult>({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 2,
        availabilities: [],
      });
    });
  });

  describe('When there are some tables with enough seats and some without', () => {
    beforeEach(async () => {
      await db.insert(tables).values({
        id: 'table1',
        revision: 0,
        seats: 2,
      });

      await db.insert(tables).values({
        id: 'table2',
        revision: 0,
        seats: 4,
      });
    });

    it('should return slots for tables with enough seats', async () => {
      const result = await listAvailableBookingSlotsHandler.execute({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 4,
      });

      expect(result).toEqual<ListAvailableBookingSlotsQueryResult>({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-01'),
        people: 4,
        availabilities: [
          {
            day: '2023-01-01',
            slots: [
              {
                startTime: '12:00',
                endTime: '14:00',
                availableTables: ['table2'],
              },
              {
                startTime: '19:00',
                endTime: '21:00',
                availableTables: ['table2'],
              },
            ],
          },
        ],
      });
    });
  });
});
