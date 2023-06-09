import { defineFeature, loadFeature } from 'jest-cucumber';
import { AddTableCommand } from './add-table.command';
import { Test, TestingModule } from '@nestjs/testing';
import { AddTable } from './add-table.service';
import { Table } from '../../domain/table';
import {
  TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
  TableEventStoreRepositoryInterface,
} from '../../infrastructure/repository/table.event-store.repository.interface';

const feature = loadFeature('./add-table.feature', {
  loadRelativePath: true,
});

defineFeature(feature, (test) => {
  let testingModule: TestingModule;
  let addTable: AddTable;
  let result: Table;

  const mockedTableEventStoreRepository: jest.Mocked<TableEventStoreRepositoryInterface> =
    {
      findTableById: jest.fn(),
      publish: jest.fn(),
    };

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        AddTable,
        {
          provide: TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
          useValue: mockedTableEventStoreRepository,
        },
      ],
    }).compile();
    addTable = testingModule.get<AddTable>(AddTable);
  });

  test('Adding a table as a manager', ({ given, when, then }) => {
    beforeAll(() => {
      mockedTableEventStoreRepository.findTableById.mockResolvedValue(null);
    });

    given('I am a manager', () => {
      // TODO: implement
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

    given('I am a manager', () => {
      // TODO: implement
    });

    given(
      /^I have added a table with the identifier "(.*)" and the number of seats "(.*)"$/,
      (id: string, seats: number) => {
        mockedTableEventStoreRepository.findTableById.mockResolvedValue(
          new Table(id, seats),
        );
      },
    );

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
      expect(expectedError.message).toEqual('Table already exists');
    });
  });
});
