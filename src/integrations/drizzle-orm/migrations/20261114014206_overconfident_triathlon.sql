PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_newsletter_subscriber` (
	`confirmation_expires_at` integer,
	`confirmation_token` text(64),
	`email` text(64) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`locale` text DEFAULT 'en-US' NOT NULL,
	`source` text DEFAULT 'footer' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`subscribed_at` integer,
	`unsubscribe_token` text(64) NOT NULL,
	`unsubscribed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_newsletter_subscriber`("confirmation_expires_at", "confirmation_token", "email", "id", "locale", "source", "status", "subscribed_at", "unsubscribe_token", "unsubscribed_at", "created_at", "updated_at") SELECT "confirmation_expires_at", "confirmation_token", "email", "id", "locale", "source", "status", "subscribed_at", "unsubscribe_token", "unsubscribed_at", "created_at", "updated_at" FROM `newsletter_subscriber`;--> statement-breakpoint
DROP TABLE `newsletter_subscriber`;--> statement-breakpoint
ALTER TABLE `__new_newsletter_subscriber` RENAME TO `newsletter_subscriber`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscriber_confirmation_token_unique` ON `newsletter_subscriber` (`confirmation_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscriber_email_unique` ON `newsletter_subscriber` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscriber_unsubscribe_token_unique` ON `newsletter_subscriber` (`unsubscribe_token`);--> statement-breakpoint
CREATE INDEX `newsletter_subscriber_status_locale_idx` ON `newsletter_subscriber` (`status`,`locale`);