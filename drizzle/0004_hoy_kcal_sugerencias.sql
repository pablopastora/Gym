CREATE TABLE `routine_suggestion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_start` text NOT NULL,
	`rule` text NOT NULL,
	`action` text NOT NULL,
	`routine_id` integer,
	`routine_day_id` integer,
	`routine_exercise_id` integer,
	`exercise_id` text,
	`suggested_exercise_id` text,
	`sets_delta` integer,
	`muscle` text,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pendiente' NOT NULL,
	`applied_summary` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`decided_at` integer,
	FOREIGN KEY (`routine_id`) REFERENCES `routine`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`routine_day_id`) REFERENCES `routine_day`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`routine_exercise_id`) REFERENCES `routine_exercise`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `routine_suggestion_week_idx` ON `routine_suggestion` (`week_start`);--> statement-breakpoint
ALTER TABLE `cardio_session` ADD `kcal` real;--> statement-breakpoint
ALTER TABLE `profile` ADD `training_weekdays` text;--> statement-breakpoint
ALTER TABLE `workout` ADD `kcal` real;--> statement-breakpoint
ALTER TABLE `workout` ADD `met` real;