CREATE TABLE `revoked_license_order` (
	`polar_order_id` text(64) PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `license` ADD `purchase_created_at` integer DEFAULT 0 NOT NULL;