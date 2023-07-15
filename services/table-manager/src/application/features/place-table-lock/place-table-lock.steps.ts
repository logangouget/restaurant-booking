import { Test, TestingModule } from '@nestjs/testing';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { Table } from '@/domain/table';
import {
  TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
  TableEventStoreRepositoryInterface,
} from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import { PlaceTableLockCommand } from './place-table-lock.command';
import { PlaceTableLockHandler } from './place-table-lock.handler';
import { TableNotFoundError } from '@/application/errors';

const feature = loadFeature('./place-table-lock.feature', {
  loadRelativePath: true,
});

defineFeature(feature, (test) => {
  let testingModule: TestingModule;
  let lockTable: PlaceTableLockHandler;

  const mockedTableEventStoreRepository: jest.Mocked<TableEventStoreRepositoryInterface> =
    {
      findTableById: jest.fn(),
      publish: jest.fn(),
    };

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        PlaceTableLockHandler,
        {
          provide: TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
          useValue: mockedTableEventStoreRepository,
        },
      ],
    }).compile();
    lockTable = testingModule.get<PlaceTableLockHandler>(PlaceTableLockHandler);
  });

  test('Locking a table', ({ given, when, then }) => {
    let tableId: string;
    let result: Table;

    given(/^a table with id "(.*)"$/, (id: string) => {
      tableId = id;
      mockedTableEventStoreRepository.findTableById.mockResolvedValueOnce(
        new Table(tableId),
      );
    });

    when(
      /^I lock the table with id "(.*)" from "(.*)" to "(.*)"$/,
      async (id: string, lockFrom: string, lockTo: string) => {
        const command = new PlaceTableLockCommand(
          id,
          {
            from: new Date(lockFrom),
            to: new Date(lockTo),
          },
          'correlationId',
        );

        result = await lockTable.execute(command);
      },
    );

    then(
      /^the table with id "(.*)" should be locked from "(.*)" to "(.*)"$/,
      () => {
        expect(result.locks.length).toBe(1);
      },
    );
  });

  test('Locking a table that does not exist', ({ given, when, then }) => {
    let error: Error;

    given(/^a table with id "(.*)"$/, () => {
      mockedTableEventStoreRepository.findTableById.mockResolvedValueOnce(null);
    });

    when(
      /^I lock the table with id "(.*)" from "(.*)" to "(.*)"$/,
      async (id: string, lockFrom: string, lockTo: string) => {
        const command = new PlaceTableLockCommand(
          id,
          {
            from: new Date(lockFrom),
            to: new Date(lockTo),
          },
          'correlationId',
        );
        try {
          await lockTable.execute(command);
        } catch (err) {
          error = err;
        }
      },
    );

    then(/^the table with id "(.*)" should not be locked$/, () => {
      expect(error).toBeInstanceOf(TableNotFoundError);
    });
  });

  test('Locking a table that is already locked', ({ given, when, then }) => {
    let tableId: string;
    let result: Table;

    given(
      /^a table with id "(.*)" already locked from "(.*)" to "(.*)"$/,
      (id: string, lockFrom: Date, lockTo: Date) => {
        tableId = id;

        const table = new Table(tableId);

        table.placeLock({
          from: lockFrom,
          to: lockTo,
        });

        table.commit();

        mockedTableEventStoreRepository.findTableById.mockResolvedValueOnce(
          table,
        );
      },
    );

    when(
      /^I lock the table with id "(.*)" from "(.*)" to "(.*)"$/,
      async (id: string, lockFrom: string, lockTo: string) => {
        const command = new PlaceTableLockCommand(
          id,
          {
            from: new Date(lockFrom),
            to: new Date(lockTo),
          },
          'correlationId',
        );
        result = await lockTable.execute(command);
      },
    );

    then(
      /^the table with id "(.*)" should be locked with the new date$/,
      () => {
        expect(result.locks.length).toBe(2);
      },
    );
  });
});
