CREATE TABLE `invitation` (
	`accepted_at` integer,
	`accepted_by` text,
	`email` text(254) NOT NULL,
	`expires_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`invited_by` text,
	`locale` text NOT NULL,
	`revoked_at` integer,
	`revoked_by` text,
	`role` text NOT NULL,
	`sent_at` integer NOT NULL,
	`token_hash` text(64) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`accepted_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`revoked_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitation_token_hash_unique` ON `invitation` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `invitation_open_email_uidx` ON `invitation` (`email`) WHERE "invitation"."accepted_at" is null and "invitation"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX `invitation_created_at_idx` ON `invitation` (`created_at`);