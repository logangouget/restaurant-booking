CREATE SCHEMA "table_manager";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "table_manager"."tables" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"seats" integer,
	"removed_at" timestamp,
	"revision" integer
);
