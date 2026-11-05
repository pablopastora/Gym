CREATE TABLE `day_override` (
	`date` text PRIMARY KEY NOT NULL,
	`training` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `exercise` ADD `role_override` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `available_plates` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `auto_set_plan` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `meso_start` text;--> statement-breakpoint
ALTER TABLE `routine_exercise` ADD `top_set` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `workout_exercise` ADD `role` text;--> statement-breakpoint
ALTER TABLE `workout_exercise` ADD `plan_note` text;--> statement-breakpoint
ALTER TABLE `workout_set` ADD `target_rir` real;