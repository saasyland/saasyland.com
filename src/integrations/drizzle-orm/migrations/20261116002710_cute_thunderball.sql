CREATE TABLE `order` (
	`changed_at` integer NOT NULL,
	`currency` text(3) NOT NULL,
	`customer_id` text(64) NOT NULL,
	`description` text NOT NULL,
	`id` text(64) PRIMARY KEY NOT NULL,
	`invoice_number` text,
	`placed_at` integer NOT NULL,
	`product_id` text(64),
	`refunded_amount` integer NOT NULL,
	`status` text NOT NULL,
	`subscription_id` text(64),
	`total_amount` integer NOT NULL,
	`user_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `order_user_placed_at_idx` ON `order` (`user_id`,`placed_at`);--> statement-breakpoint
CREATE INDEX `order_status_placed_at_idx` ON `order` (`status`,`placed_at`);--> statement-breakpoint
CREATE TABLE `subscription` (
	`amount` integer NOT NULL,
	`cancel_at_period_end` integer NOT NULL,
	`changed_at` integer NOT NULL,
	`currency` text(3) NOT NULL,
	`current_period_end` integer NOT NULL,
	`customer_id` text(64) NOT NULL,
	`ended_at` integer,
	`id` text(64) PRIMARY KEY NOT NULL,
	`product_id` text(64) NOT NULL,
	`product_name` text NOT NULL,
	`recurring_interval` text NOT NULL,
	`recurring_interval_count` integer NOT NULL,
	`started_at` integer,
	`status` text NOT NULL,
	`user_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `subscription_user_status_idx` ON `subscription` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `subscription_status_current_period_end_idx` ON `subscription` (`status`,`current_period_end`);