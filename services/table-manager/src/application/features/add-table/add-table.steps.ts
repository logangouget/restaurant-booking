import { Table } from '@/domain/table';
import {
  TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
  TableEventStoreRepositoryInterface,
} from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { AddTableCommand } from './add-table.command';
import { AddTableHandler } from './add-table.handler';
import { TableAlreadyExistsError } from './errors';

const feature = loadFeature('./add-table.feature', {
  loadRelativePath: true,
});

defineFeature(feature, (test) => {
  let testingModule: TestingModule;
  let addTable: AddTableHandler;
  let result: Table;

  const mockedTableEventStoreRepository: jest.Mocked<TableEventStoreRepositoryInterface> =
    {
      findTableById: jest.fn(),
      publish: jest.fn(),
    };

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        AddTableHandler,
        {
          provide: TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
          useValue: mockedTableEventStoreRepository,
        },
      ],
    }).compile();
    addTable = testingModule.get<AddTableHandler>(AddTableHandler);
  });

  test('Adding a table as a manager', ({ when, then }) => {
    beforeAll(() => {
      mockedTableEventStoreRepository.findTableById.mockResolvedValue(null);
    });

    when(
      /^I add a table with the identifier "(.*)" and the number of seats "(.*)"$/,
      async (id: string, seats: number) => {
        const command = new AddTableCommand(id, seats);
        result = await addTable.execute(command);
      },
    );

    then('It should be added to the list of tables', () => {
      expect(result).toBeDefined();
    });
  });

  test('Giving a non-unique identifier', ({ given, when, then }) => {
    let expectedError: Error;

    given(/^I have added a table with the identifier "(.*)"$/, (id: string) => {
      mockedTableEventStoreRepository.findTableById.mockResolvedValue(
        new Table(id),
      );
    });

    when(
      /^I add a table with the identifier "(.*)" and the number of seats "(.*)"$/,
      async (id: string, seats: number) => {
        const command = new AddTableCommand(id, seats);

        try {
          await addTable.execute(command);
        } catch (error) {
          expectedError = error;
        }
      },
    );

    then('It should not be added to the list of tables', () => {
      expect(expectedError).toBeInstanceOf(TableAlreadyExistsError);
    });
  });
});
