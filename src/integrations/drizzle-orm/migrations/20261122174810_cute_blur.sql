CREATE TABLE `__withdrawal_license` (
	`id` text PRIMARY KEY NOT NULL,
	`license_id` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__withdrawal_license`("id", "license_id") SELECT "id", "license_id" FROM `withdrawal` WHERE "license_id" IS NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_license` (
	`activated_at` integer,
	`delivered_at` integer,
	`id` text PRIMARY KEY NOT NULL,
	`key` text(128),
	`lesson_opened_at` integer,
	`opened_lesson_id` text,
	`polar_customer_id` text(64) NOT NULL,
	`polar_license_key_id` text(64),
	`polar_order_id` text(64),
	`purchase_created_at` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`tier` text NOT NULL,
	`user_id` text,
	`withdrawal_consent_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_license`("activated_at", "delivered_at", "id", "key", "lesson_opened_at", "opened_lesson_id", "polar_customer_id", "polar_license_key_id", "polar_order_id", "purchase_created_at", "status", "tier", "user_id", "withdrawal_consent_at", "created_at", "updated_at") SELECT "activated_at", "delivered_at", "id", "key", "lesson_opened_at", "opened_lesson_id", "polar_customer_id", "polar_license_key_id", "polar_order_id", "purchase_created_at", "status", "tier", "user_id", "withdrawal_consent_at", "created_at", "updated_at" FROM `license`;--> statement-breakpoint
DROP TABLE `license`;--> statement-breakpoint
ALTER TABLE `__new_license` RENAME TO `license`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `license_key_unique` ON `license` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `license_polar_license_key_id_unique` ON `license` (`polar_license_key_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `license_user_id_unique` ON `license` (`user_id`);--> statement-breakpoint
CREATE INDEX `license_status_tier_idx` ON `license` (`status`,`tier`);--> statement-breakpoint
UPDATE `withdrawal` SET "license_id" = (SELECT "license_id" FROM `__withdrawal_license` WHERE `__withdrawal_license`."id" = `withdrawal`."id") WHERE "id" IN (SELECT "id" FROM `__withdrawal_license`);--> statement-breakpoint
DROP TABLE `__withdrawal_license`;--> statement-breakpoint
ALTER TABLE `session` ADD `country` text(2);