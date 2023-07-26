import { Test, TestingModule } from '@nestjs/testing';
import { loadFeature, defineFeature } from 'jest-cucumber';
import { InitiateTableBookingHandler } from './initiate-table-booking.handler';
import { TableBooking } from '@/domain/table-booking';
import {
  TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE,
  TableBookingEventStoreRepositoryInterface,
} from '@/infrastructure/repository/event-store/table-booking.event-store.repository.interface';
import { SlotUnavailableException } from '@/domain/exceptions';
import { TimeSlot } from '@/domain/time-slot.value-object';

const feature = loadFeature('./initiate-table-booking.feature', {
  loadRelativePath: true,
});

defineFeature(feature, (test) => {
  let testingModule: TestingModule;
  let bookTable: InitiateTableBookingHandler;
  let result: TableBooking;

  const mockedTableBookingEventStoreRepository: jest.Mocked<TableBookingEventStoreRepositoryInterface> =
    {
      isTableAvailableForTimeSlot: jest.fn(),
      publish: jest.fn(),
      findBookingById: jest.fn(),
    };

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        InitiateTableBookingHandler,
        {
          provide: TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE,
          useValue: mockedTableBookingEventStoreRepository,
        },
      ],
    }).compile();
    bookTable = testingModule.get<InitiateTableBookingHandler>(
      InitiateTableBookingHandler,
    );
  });

  test('Initiate booking', ({ given, when, then }) => {
    let tableId: string;

    given(/^a table with id "(.*)" and a free time slot$/, (id: string) => {
      tableId = id;

      mockedTableBookingEventStoreRepository.isTableAvailableForTimeSlot.mockResolvedValueOnce(
        true,
      );
    });

    when('I book this table', async () => {
      result = await bookTable.execute({
        tableId,
        timeSlot: {
          from: new Date('2023-01-01T12:00'),
          to: new Date('2023-01-01T14:00'),
        },
      });
    });

    then('Booking should be initiated', () => {
      expect(result.status).toEqual('initiated');
    });
  });

  test('Initiate booking for a table that is already booked', ({
    given,
    when,
    then,
  }) => {
    let tableId: string;
    let error: Error;
    const timeSlot = new TimeSlot(new Date(), new Date());

    given(
      /^a table with id "(.*)" and a time slot that is already booked$/,
      (id: string) => {
        tableId = id;

        mockedTableBookingEventStoreRepository.isTableAvailableForTimeSlot.mockResolvedValueOnce(
          false,
        );
      },
    );

    when('I book this table', async () => {
      try {
        await bookTable.execute({
          tableId,
          timeSlot,
        });
      } catch (err) {
        error = err;
      }
    });

    then('booking should not be initiated', () => {
      expect(error).toBeInstanceOf(SlotUnavailableException);
    });
  });
});
