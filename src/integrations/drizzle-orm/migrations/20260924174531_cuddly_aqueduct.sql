CREATE TABLE `rate_limit` (
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`key` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limit_expires_at_idx` ON `rate_limit` (`expires_at`);