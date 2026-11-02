ALTER TABLE `profile` ADD `deload_until` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `deload_snooze_until` text;--> statement-breakpoint
ALTER TABLE `workout_exercise` ADD `progression_action` text;--> statement-breakpoint
ALTER TABLE `workout_exercise` ADD `progression_delta_kg` real;--> statement-breakpoint
ALTER TABLE `workout_exercise` ADD `progression_note` text;