CREATE TABLE `energy_adjustment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_date` text NOT NULL,
	`from_date` text NOT NULL,
	`to_date` text NOT NULL,
	`logged_days` integer NOT NULL,
	`avg_intake` real NOT NULL,
	`avg_estimated` real NOT NULL,
	`weight_change_kg` real NOT NULL,
	`observed_tdee` real NOT NULL,
	`delta_kcal` real NOT NULL,
	`status` text DEFAULT 'pendiente' NOT NULL,
	`decided_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `profile` ADD `activity_level` text DEFAULT 'ligero' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `target_rate_kg_week` real;--> statement-breakpoint
ALTER TABLE `profile` ADD `kcal_target_manual` integer;--> statement-breakpoint
ALTER TABLE `profile` ADD `protein_g_per_kg` real DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `fat_g_per_kg` real DEFAULT 0.7 NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `tdee_adjust_kcal` real DEFAULT 0 NOT NULL;