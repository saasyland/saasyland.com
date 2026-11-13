CREATE TABLE `chapter` (
	`course_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`title` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chapter_course_position_idx` ON `chapter` (`course_id`,`position`);--> statement-breakpoint
CREATE TABLE `course` (
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'course' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`slug` text(96) NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`summary` text NOT NULL,
	`title` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_slug_unique` ON `course` (`slug`);--> statement-breakpoint
CREATE INDEX `course_status_position_idx` ON `course` (`status`,`position`);--> statement-breakpoint
CREATE TABLE `lesson` (
	`access` text DEFAULT 'paid' NOT NULL,
	`chapter_id` text NOT NULL,
	`course_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`slug` text(96) NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`summary` text NOT NULL,
	`title` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`video_id` text,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_course_slug_idx` ON `lesson` (`course_id`,`slug`);--> statement-breakpoint
CREATE INDEX `lesson_chapter_position_idx` ON `lesson` (`chapter_id`,`position`);--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`completed_at` integer,
	`lesson_id` text NOT NULL,
	`position_ms` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `lesson_id`),
	FOREIGN KEY (`lesson_id`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
