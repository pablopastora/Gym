ALTER TABLE `food` ADD `pref` text;--> statement-breakpoint
ALTER TABLE `food` ADD `in_pantry` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `diet_flags` text DEFAULT '[]' NOT NULL;