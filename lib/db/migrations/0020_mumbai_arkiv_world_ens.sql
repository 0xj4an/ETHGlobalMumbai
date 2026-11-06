CREATE TABLE "arkiv_entities" (
	"h3_id" text PRIMARY KEY NOT NULL,
	"entity_key" text NOT NULL,
	"expires_at_block" bigint NOT NULL,
	"needs_extend" boolean DEFAULT false NOT NULL,
	"level" integer NOT NULL,
	"last_tx" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arkiv_queue" (
	"h3_id" text PRIMARY KEY NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "ens_titles" (
	"zone" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"leader" text,
	"score" integer DEFAULT 0 NOT NULL,
	"tx_hash" text,
	"written_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "world_verifications" (
	"player_key" text PRIMARY KEY NOT NULL,
	"nullifier" text NOT NULL,
	"credential" text NOT NULL,
	"environment" text NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "world_verifications_nullifier_unique" UNIQUE("nullifier")
);
--> statement-breakpoint
CREATE INDEX "arkiv_entities_needs_extend_idx" ON "arkiv_entities" USING btree ("needs_extend");