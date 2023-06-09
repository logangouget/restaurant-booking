import {
  EventStoreDBClient,
  jsonEvent,
  FORWARDS,
  START,
  JSONEventType,
} from "@eventstore/db-client";

const client = EventStoreDBClient.connectionString(
  "esdb://127.0.0.1:2113?tls=false&keepAliveTimeout=10000&keepAliveInterval=10000"
);

interface Reservation {
  reservationId: string;
  movieId: string;
  userId: string;
  seatId: string;
}

type SeatReservedEvent = JSONEventType<
  "seat-reserved",
  {
    reservationId: string;
    movieId: string;
    userId: string;
    seatId: string;
  }
>;

type SeatChangedEvent = JSONEventType<
  "seat-changed",
  {
    reservationId: string;
    newSeatId: string;
  }
>;

type ReservationEvents = SeatReservedEvent | SeatChangedEvent;

async function simpleTest(): Promise<void> {
  const streamName = "booking-abc123";

  const event = jsonEvent<SeatReservedEvent>({
    type: "seat-reserved",
    data: {
      reservationId: "abc123",
      movieId: "tt0368226",
      userId: "nm0802995",
      seatId: "4b",
    },
  });

  const appendResult = await client.appendToStream(streamName, event);

  const events = client.readStream<ReservationEvents>(streamName, {
    fromRevision: START,
    direction: FORWARDS,
    maxCount: 10,
  });

  const reservation: Partial<Reservation> = {};

  for await (const { event } of events) {
    if (!event) {
      break;
    }

    switch (event.type) {
      case "seat-reserved": {
        reservation.reservationId = event.data.reservationId;
        reservation.movieId = event.data.movieId;
        reservation.seatId = event.data.seatId;
        reservation.userId = event.data.userId;
        break;
      }
      case "seat-changed": {
        reservation.seatId = event.data.newSeatId;
        break;
      }
      default: {
        const _exhaustiveCheck: never = event;
        break;
      }
    }
  }
}

simpleTest().catch((e) => console.error(e));
