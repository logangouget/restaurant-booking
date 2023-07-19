CREATE SCHEMA "booker";
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "booking_status" AS ENUM('initiated', 'cancelled', 'confirmed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "booker"."bookings" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"time_slot_from" timestamp,
	"time_slot_to" timestamp,
	"table_id" varchar(256),
	"booking_status" "booking_status",
	"revision" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "booker"."tables" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"seats" integer,
	"removed_at" timestamp,
	"revision" integer
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booker"."bookings" ADD CONSTRAINT "bookings_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "booker"."tables"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
