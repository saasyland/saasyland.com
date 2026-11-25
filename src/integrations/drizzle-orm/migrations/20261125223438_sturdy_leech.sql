CREATE TABLE `business_profile` (
	`address` text(500) DEFAULT '' NOT NULL,
	`id` text PRIMARY KEY DEFAULT 'business' NOT NULL,
	`logo` text,
	`name` text(120) DEFAULT 'SaaSy Land' NOT NULL,
	`support_email` text(254) DEFAULT 'hello@saasyland.com' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `business_profile` DEFAULT VALUES;