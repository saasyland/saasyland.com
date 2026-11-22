CREATE TABLE `withdrawal` (
	`acknowledged_at` integer,
	`channel` text NOT NULL,
	`eligibility` text NOT NULL,
	`email` text(254) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`license_id` text,
	`locale` text NOT NULL,
	`name` text(100) NOT NULL,
	`polar_order_id` text(64),
	`reference` text(128) NOT NULL,
	`user_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`license_id`) REFERENCES `license`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `withdrawal_user_created_at_idx` ON `withdrawal` (`user_id`,`created_at`);