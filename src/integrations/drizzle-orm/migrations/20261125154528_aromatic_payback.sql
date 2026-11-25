CREATE TABLE `newsletter_issue` (
	`body` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`last_recipient_id` text,
	`lease_expires_at` integer,
	`recipient_count` integer NOT NULL,
	`sent_at` integer,
	`sent_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'sending' NOT NULL,
	`subject` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `newsletter_issue_created_at_idx` ON `newsletter_issue` (`created_at`);