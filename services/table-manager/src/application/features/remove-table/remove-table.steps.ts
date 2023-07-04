import { Test, TestingModule } from '@nestjs/testing';
import { defineFeature, loadFeature } from 'jest-cucumber';
import {
  TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
  TableEventStoreRepositoryInterface,
} from '@/infrastructure/repository/table.event-store.repository.interface';
import { RemoveTableHandler } from './remove-table.handler';
import { Table } from '@/domain/table';
import { RemoveTableCommand } from './remove-table.command';

const feature = loadFeature('./remove-table.feature', {
  loadRelativePath: true,
});

defineFeature(feature, (test) => {
  let testingModule: TestingModule;
  let removeTable: RemoveTableHandler;

  const mockedTableEventStoreRepository: jest.Mocked<TableEventStoreRepositoryInterface> =
    {
      findTableById: jest.fn(),
      publish: jest.fn(),
    };

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        RemoveTableHandler,
        {
          provide: TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
          useValue: mockedTableEventStoreRepository,
        },
      ],
    }).compile();
    removeTable = testingModule.get<RemoveTableHandler>(RemoveTableHandler);
  });

  test('Remove a table as a manager', ({ given, when, then }) => {
    let error: Error;
    let table: Table;

    given('I am a manager', () => {
      // TODO: implement
    });

    given(/^An existing table with the identifier "(.*)"$/, (id: string) => {
      table = new Table(id);
      mockedTableEventStoreRepository.findTableById.mockResolvedValue(table);
    });

    when(
      /^I remove a table with the identifier "(.*)"$/,
      async (id: string) => {
        try {
          const command = new RemoveTableCommand(id);
          await removeTable.execute(command);
        } catch (err) {
          error = err;
        }
      },
    );

    then('It should be removed to the list of tables', () => {
      expect(error).toBeUndefined();
      expect(table.removed).toBe(true);
    });
  });

  test('Giving a non-existing table', ({ given, when, then }) => {
    let error: Error;

    beforeEach(async () => {
      mockedTableEventStoreRepository.findTableById.mockResolvedValue(null);
    });

    given('I am a manager', () => {
      // TODO : implement
    });

    when(
      /^I remove a table with the identifier "(.*)"$/,
      async (id: string) => {
        try {
          const command = new RemoveTableCommand(id);
          await removeTable.execute(command);
        } catch (err) {
          error = err;
        }
      },
    );

    then('It should not be removed to the list of tables', () => {
      expect(error).toBeDefined();
    });
  });
});
