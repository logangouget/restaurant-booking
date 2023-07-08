import {
  TableBookingEventStoreRepositoryInterface,
  TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE,
} from '@/infrastructure/repository/table-booking.event-store.repository.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { loadFeature, defineFeature } from 'jest-cucumber';
import { CancelTableBookingHandler } from './cancel-table-booking.handler';
import { TableBooking } from '@/domain/table-booking';
import { CancelTableBookingCommand } from './cancel-table-booking.command';
import { TableBookingNotFoundError } from '@/application/errors';

const feature = loadFeature('./cancel-table-booking.feature', {
  loadRelativePath: true,
});

defineFeature(feature, (test) => {
  let testingModule: TestingModule;
  let cancelTableBooking: CancelTableBookingHandler;

  const mockedTableBookingEventStoreRepository: jest.Mocked<TableBookingEventStoreRepositoryInterface> =
    {
      findBookingsByTimeSlot: jest.fn(),
      publish: jest.fn(),
      findBookingByCorrelationId: jest.fn(),
    };

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        CancelTableBookingHandler,
        {
          provide: TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE,
          useValue: mockedTableBookingEventStoreRepository,
        },
      ],
    }).compile();
    cancelTableBooking = testingModule.get<CancelTableBookingHandler>(
      CancelTableBookingHandler,
    );
  });

  test('Cancel table booking', ({ given, when, then }) => {
    let result: TableBooking;
    let tableId: string;

    given(
      /^an initiated booking for table "(.*)" from "(.*)" to "(.*)"$/,
      (tableId: string, bookingFrom: string, bookingTo: string) => {
        const booking = new TableBooking();
        booking.initiate(tableId, {
          from: new Date(bookingFrom),
          to: new Date(bookingTo),
        });
        booking.commit();

        tableId = booking.tableId;

        mockedTableBookingEventStoreRepository.findBookingByCorrelationId.mockResolvedValueOnce(
          booking,
        );
      },
    );

    when('booking is going to be cancelled', async () => {
      result = await cancelTableBooking.execute(
        new CancelTableBookingCommand(tableId, 'x-correlation-id'),
      );
    });

    then('booking status is updated to cancelled', () => {
      expect(result.status).toBe('cancelled');
    });
  });

  test('Table booking is not found', ({ given, when, then }) => {
    let error: TableBookingNotFoundError;

    given(
      /^a non-existing booking for table "(.*)" from "(.*)" to "(.*)"$/,
      () => {
        mockedTableBookingEventStoreRepository.findBookingByCorrelationId.mockResolvedValueOnce(
          null,
        );
      },
    );

    when('booking is going to be cancelled', async () => {
      try {
        await cancelTableBooking.execute(
          new CancelTableBookingCommand(
            'non-existing-table-id',
            'x-correlation-id',
          ),
        );
      } catch (err) {
        error = err;
      }
    });

    then('booking status is not updated', () => {
      expect(error).toBeInstanceOf(TableBookingNotFoundError);
    });
  });
});