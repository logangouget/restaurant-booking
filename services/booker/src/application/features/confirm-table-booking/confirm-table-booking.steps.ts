import { TableBooking } from '@/domain/table-booking';
import { Test, TestingModule } from '@nestjs/testing';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { ConfirmTableBookingCommand } from './confirm-table-booking.command';
import { ConfirmTableBookingHandler } from './confirm-table-booking.handler';
import {
  TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE,
  TableBookingEventStoreRepositoryInterface,
} from '@/infrastructure/repository/event-store/table-booking.event-store.repository.interface';
import { TableBookingNotFoundError } from '@/application/errors';
import { TimeSlot } from '@/domain/time-slot.value-object';

const feature = loadFeature('./confirm-table-booking.feature', {
  loadRelativePath: true,
});

defineFeature(feature, (test) => {
  let testingModule: TestingModule;
  let confirmTableBooking: ConfirmTableBookingHandler;

  const mockedTableBookingEventStoreRepository: jest.Mocked<TableBookingEventStoreRepositoryInterface> =
    {
      isTableAvailableForTimeSlot: jest.fn(),
      publish: jest.fn(),
      findBookingById: jest.fn(),
    };

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        ConfirmTableBookingHandler,
        {
          provide: TABLE_BOOKING_EVENT_STORE_REPOSITORY_INTERFACE,
          useValue: mockedTableBookingEventStoreRepository,
        },
      ],
    }).compile();
    confirmTableBooking = testingModule.get<ConfirmTableBookingHandler>(
      ConfirmTableBookingHandler,
    );
  });

  test('Confirm table booking', ({ given, when, then }) => {
    let result: TableBooking;
    let bookingId: string;

    given(
      /^an initiated booking for table "(.*)" from "(.*)" to "(.*)"$/,
      (tableId: string, bookingFrom: string, bookingTo: string) => {
        const booking = new TableBooking();
        booking.initiate(
          tableId,
          new TimeSlot(new Date(bookingFrom), new Date(bookingTo)),
        );
        booking.commit();

        bookingId = booking.id;

        mockedTableBookingEventStoreRepository.findBookingById.mockResolvedValueOnce(
          booking,
        );
      },
    );

    when('booking is going to be confirmed', async () => {
      const command = new ConfirmTableBookingCommand(bookingId);
      result = await confirmTableBooking.execute(command);
    });

    then('booking status is updated to confirmed', () => {
      expect(result.status).toBe('confirmed');
    });
  });

  test('Table booking is not found', ({ given, when, then }) => {
    let error: TableBookingNotFoundError;

    given(
      /^a non-existing booking for table "(.*)" from "(.*)" to "(.*)"$/,
      () => {
        mockedTableBookingEventStoreRepository.findBookingById.mockResolvedValueOnce(
          null,
        );
      },
    );

    when('booking is going to be confirmed', async () => {
      try {
        const command = new ConfirmTableBookingCommand(
          'non-existing-booking-id',
        );
        await confirmTableBooking.execute(command);
      } catch (err) {
        error = err;
      }
    });

    then('booking status is not updated', () => {
      expect(error).toBeInstanceOf(TableBookingNotFoundError);
    });
  });
});
