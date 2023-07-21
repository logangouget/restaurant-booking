import { Table, TimeSlot } from '@/domain/table';
import {
  TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
  TableEventStoreRepositoryInterface,
} from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { RemoveTableLockHandler } from './remove-table-lock-handler';
import {
  TableLockNotFoundError,
  TableNotFoundError,
} from '@/application/errors';
import { RemoveTableLockJobProcessor } from './remove-table-lock-job-processor';
import { Job } from 'bullmq';

const feature = loadFeature('./remove-table-lock.feature', {
  loadRelativePath: true,
});

defineFeature(feature, (test) => {
  let testingModule: TestingModule;
  let removeTableLockHandler: RemoveTableLockHandler;
  let removeTableLockJobProcessor: RemoveTableLockJobProcessor;

  const mockedTableEventStoreRepository: jest.Mocked<TableEventStoreRepositoryInterface> =
    {
      findTableById: jest.fn(),
      publish: jest.fn(),
    };

  const mockedQueue = {
    add: jest.fn(),
  };

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        RemoveTableLockHandler,
        RemoveTableLockJobProcessor,
        {
          provide: TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
          useValue: mockedTableEventStoreRepository,
        },
        {
          provide: 'BullQueue_remove-table-lock',
          useValue: mockedQueue,
        },
      ],
    }).compile();
    removeTableLockHandler = testingModule.get<RemoveTableLockHandler>(
      RemoveTableLockHandler,
    );
    removeTableLockJobProcessor =
      testingModule.get<RemoveTableLockJobProcessor>(
        RemoveTableLockJobProcessor,
      );
  });

  test('Schedule a table lock removal', ({ given, and, when, then }) => {
    let tableId: string;
    let table: Table;
    let timeSlot: TimeSlot;

    given(/^a table with id "(.*)"$/, (id: string) => {
      tableId = id;
      table = new Table(tableId);
      mockedTableEventStoreRepository.findTableById.mockResolvedValueOnce(
        table,
      );
    });

    and(
      /^a lock is placed from "(.*)" to "(.*)"$/,
      (lockFrom: string, lockTo: string) => {
        timeSlot = {
          from: new Date(lockFrom),
          to: new Date(lockTo),
        };

        table.placeLock(timeSlot);
      },
    );

    when('I schedule a lock removal for the previous lock', async () => {
      await removeTableLockHandler.execute({
        tableId,
        timeSlot,
        correlationId: 'correlationId',
      });
    });

    then('the table lock removal should be scheduled', () => {
      expect(mockedQueue.add).toHaveBeenCalledWith(
        'remove-table-lock',
        {
          tableId,
          timeSlot: {
            from: timeSlot.from.toISOString(),
            to: timeSlot.to.toISOString(),
          },
          correlationId: 'correlationId',
        },
        {
          delay: expect.any(Number),
        },
      );
    });
  });

  test("Schedule a table lock removal when table doesn't exist", ({
    given,
    and,
    when,
    then,
  }) => {
    let error: Error;

    given(/^a table with id "(.*)"$/, () => {
      // No implementation needed
    });

    and(/^a lock is placed from "(.*)" to "(.*)"$/, () => {
      // No implementation needed
    });

    when(
      /^I schedule a lock removal on a table with id "(.*)"$/,
      async (id: string) => {
        mockedTableEventStoreRepository.findTableById.mockResolvedValueOnce(
          null,
        );

        try {
          await removeTableLockHandler.execute({
            tableId: id,
            timeSlot: {
              from: new Date(),
              to: new Date(),
            },
            correlationId: 'correlationId',
          });
        } catch (err) {
          error = err;
        }
      },
    );

    then('the table lock removal should not be scheduled', () => {
      expect(error).toBeInstanceOf(TableNotFoundError);
    });
  });

  test("Schedule a table lock removal when lock doesn't exist", ({
    given,
    and,
    when,
    then,
  }) => {
    let tableId: string;
    let error: Error;

    given(/^a table with id "(.*)"$/, (id: string) => {
      tableId = id;
      mockedTableEventStoreRepository.findTableById.mockResolvedValueOnce(
        new Table(tableId),
      );
    });

    and('a lock is not placed', () => {
      // No implementation needed
    });

    when('I schedule a lock removal', async () => {
      try {
        await removeTableLockHandler.execute({
          tableId,
          timeSlot: {
            from: new Date(),
            to: new Date(),
          },
          correlationId: 'correlationId',
        });
      } catch (err) {
        error = err;
      }
    });

    then('the table lock removal should not be scheduled', () => {
      expect(error).toBeInstanceOf(TableLockNotFoundError);
    });
  });

  test('Remove table lock', ({ given, and, when, then }) => {
    let tableId: string;
    let table: Table;
    let timeSlot: TimeSlot;

    given(/^a table with id "(.*)"$/, (id: string) => {
      tableId = id;
      table = new Table(tableId);

      mockedTableEventStoreRepository.findTableById.mockResolvedValueOnce(
        table,
      );
    });

    and(
      /^a lock is placed from "(.*)" to "(.*)"$/,
      (timeSlotFrom: string, timeSlotTo: string) => {
        timeSlot = {
          from: new Date(timeSlotFrom),
          to: new Date(timeSlotTo),
        };

        table.placeLock(timeSlot);
      },
    );

    when('I remove the lock', async () => {
      await removeTableLockJobProcessor.removeTableLock({
        data: {
          tableId,
          timeSlot: {
            from: timeSlot.from.toISOString(),
            to: timeSlot.to.toISOString(),
          },
          correlationId: 'correlationId',
        },
      } as Job);
    });

    then('the table lock should be removed', () => {
      expect(table.getLockByTimeSlot(timeSlot)).toBeUndefined();
    });
  });

  test("Remove table lock when table doesn't exist", ({
    given,
    and,
    when,
    then,
  }) => {
    let error: Error;

    given(/^a table with id "(.*)"$/, () => {
      // No implementation needed
    });

    and(/^a lock is placed from "(.*)" to "(.*)"$/, () => {
      // No implementation needed
    });

    when(/^I remove the lock on a table with id "(.*)"$/, async () => {
      mockedTableEventStoreRepository.findTableById.mockResolvedValueOnce(null);

      try {
        await removeTableLockJobProcessor.removeTableLock({
          data: {
            tableId: 'tableId',
            timeSlot: {
              from: new Date().toISOString(),
              to: new Date().toISOString(),
            },
            correlationId: 'correlationId',
          },
        } as Job);
      } catch (err) {
        error = err;
      }
    });

    then('the table lock should not be removed', () => {
      expect(error).toBeInstanceOf(TableNotFoundError);
    });
  });
});
