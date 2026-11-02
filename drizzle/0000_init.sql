CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `body_measurement` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`waist_cm` real,
	`chest_cm` real,
	`arm_cm` real,
	`thigh_cm` real,
	`hip_cm` real,
	`body_fat_pct` real,
	`note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `body_measurement_date_idx` ON `body_measurement` (`date`);--> statement-breakpoint
CREATE TABLE `body_weight` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`weight_kg` real NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `body_weight_date_idx` ON `body_weight` (`date`);--> statement-breakpoint
CREATE TABLE `cardio_session` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`duration_min` real NOT NULL,
	`steps` integer,
	`distance_km` real,
	`notes` text,
	`workout_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `cardio_date_idx` ON `cardio_session` (`date`);--> statement-breakpoint
CREATE TABLE `exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`name_es` text NOT NULL,
	`name_en` text,
	`source` text NOT NULL,
	`curated` integer DEFAULT false NOT NULL,
	`primary_muscles` text NOT NULL,
	`secondary_muscles` text NOT NULL,
	`equipment` text,
	`category` text NOT NULL,
	`level` text,
	`body_region` text NOT NULL,
	`kind` text NOT NULL,
	`default_rest_s` integer,
	`instructions` text NOT NULL,
	`common_errors` text NOT NULL,
	`technique_note` text,
	`images` text NOT NULL,
	`video_url` text,
	`media_attribution` text,
	`is_favorite` integer DEFAULT false NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL,
	`custom_photo_file` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exercise_name_idx` ON `exercise` (`name_es`);--> statement-breakpoint
CREATE TABLE `exercise_progress` (
	`exercise_id` text PRIMARY KEY NOT NULL,
	`working_weight_kg` real,
	`stall_count` integer DEFAULT 0 NOT NULL,
	`last_suggestion` text,
	`updated_at` integer,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `media_cache` (
	`url` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`bytes` integer,
	`last_used_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `personal_record` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exercise_id` text NOT NULL,
	`record_type` text NOT NULL,
	`value` real NOT NULL,
	`weight_kg` real,
	`reps` integer,
	`workout_id` integer,
	`workout_set_id` integer,
	`achieved_at` integer NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`workout_set_id`) REFERENCES `workout_set`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `personal_record_ex_idx` ON `personal_record` (`exercise_id`,`record_type`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`height_cm` real DEFAULT 185 NOT NULL,
	`start_weight_kg` real DEFAULT 95 NOT NULL,
	`goal_weight_kg` real,
	`goal_date` text,
	`age` integer,
	`sex` text,
	`injuries` text,
	`days_per_week` integer DEFAULT 4 NOT NULL,
	`increment_upper_kg` real DEFAULT 2.5 NOT NULL,
	`increment_lower_kg` real DEFAULT 5 NOT NULL,
	`deficit_mode` integer DEFAULT true NOT NULL,
	`rest_compound_s` integer DEFAULT 150 NOT NULL,
	`rest_accessory_s` integer DEFAULT 75 NOT NULL,
	`rest_abs_s` integer DEFAULT 50 NOT NULL,
	`last_deload_date` text,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `progress_photo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`view` text NOT NULL,
	`file_name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `progress_photo_date_idx` ON `progress_photo` (`date`);--> statement-breakpoint
CREATE TABLE `reminder` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`weekday` integer NOT NULL,
	`hour` integer NOT NULL,
	`minute` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`notification_id` text
);
--> statement-breakpoint
CREATE TABLE `routine` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	`is_active` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routine_day` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_id` integer NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_optional` integer DEFAULT false NOT NULL,
	`cardio_note` text,
	`notes` text,
	FOREIGN KEY (`routine_id`) REFERENCES `routine`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `routine_day_routine_idx` ON `routine_day` (`routine_id`);--> statement-breakpoint
CREATE TABLE `routine_exercise` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_day_id` integer NOT NULL,
	`exercise_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`sets` integer DEFAULT 3 NOT NULL,
	`rep_min` integer DEFAULT 8 NOT NULL,
	`rep_max` integer DEFAULT 12 NOT NULL,
	`rest_s` integer,
	`warmup_sets` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`superset_group` integer,
	FOREIGN KEY (`routine_day_id`) REFERENCES `routine_day`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `routine_exercise_day_idx` ON `routine_exercise` (`routine_day_id`);--> statement-breakpoint
CREATE TABLE `workout` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`date` text NOT NULL,
	`routine_day_id` integer,
	`name` text NOT NULL,
	`notes` text,
	`is_deload` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`routine_day_id`) REFERENCES `routine_day`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workout_date_idx` ON `workout` (`date`);--> statement-breakpoint
CREATE TABLE `workout_exercise` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workout_id` integer NOT NULL,
	`exercise_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`rep_min` integer,
	`rep_max` integer,
	`rest_s` integer,
	`target_weight_kg` real,
	`notes` text,
	`superset_group` integer,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workout_exercise_workout_idx` ON `workout_exercise` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workout_exercise_exercise_idx` ON `workout_exercise` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `workout_set` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workout_exercise_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`set_type` text DEFAULT 'normal' NOT NULL,
	`weight_kg` real,
	`reps` integer,
	`rir` real,
	`rpe` real,
	`completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercise`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_set_we_idx` ON `workout_set` (`workout_exercise_id`);