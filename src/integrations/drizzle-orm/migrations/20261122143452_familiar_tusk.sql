ALTER TABLE `order` ADD `billing_country` text(2);--> statement-breakpoint
ALTER TABLE `order` ADD `discount_amount` integer;--> statement-breakpoint
ALTER TABLE `order` ADD `discount_code` text;--> statement-breakpoint
ALTER TABLE `order` ADD `discount_id` text(64);--> statement-breakpoint
ALTER TABLE `order` ADD `discount_name` text;