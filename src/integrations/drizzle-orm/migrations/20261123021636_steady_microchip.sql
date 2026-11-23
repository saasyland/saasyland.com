CREATE TABLE `video_upload` (
	`content_type` text NOT NULL,
	`failure` text,
	`file_name` text(120) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`last_modified` integer NOT NULL,
	`lesson_id` text NOT NULL,
	`multipart_id` text NOT NULL,
	`object_key` text NOT NULL,
	`part_bytes` integer NOT NULL,
	`parts` text DEFAULT '{}' NOT NULL,
	`size_bytes` integer NOT NULL,
	`status` text DEFAULT 'uploading' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `video_upload_lesson_id_unique` ON `video_upload` (`lesson_id`);--> statement-breakpoint
CREATE INDEX `video_upload_status_idx` ON `video_upload` (`status`,`created_at`);--> statement-breakpoint
ALTER TABLE `lesson` ADD `format` text DEFAULT 'video' NOT NULL;--> statement-breakpoint
UPDATE `lesson` SET `video_id` = NULL WHERE `video_id` IN (SELECT `id` FROM `video` WHERE `placeholder` = 1);