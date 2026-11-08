CREATE TABLE `diary_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`meal` text NOT NULL,
	`food_id` integer,
	`name` text NOT NULL,
	`quantity` real,
	`unit` text,
	`grams` real,
	`kcal` real NOT NULL,
	`protein` real DEFAULT 0 NOT NULL,
	`carbs` real DEFAULT 0 NOT NULL,
	`fat` real DEFAULT 0 NOT NULL,
	`fiber` real DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`food_id`) REFERENCES `food`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `diary_date_idx` ON `diary_entry` (`date`);--> statement-breakpoint
CREATE TABLE `food` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`base_key` text,
	`barcode` text,
	`source` text NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`category` text DEFAULT 'otros' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`kcal` real NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	`fiber` real,
	`salt` real,
	`unit_label` text,
	`unit_g` real,
	`serving_g` real,
	`servings` real,
	`is_favorite` integer DEFAULT false NOT NULL,
	`edited` integer DEFAULT false NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`last_used_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `food_base_key_idx` ON `food` (`base_key`);--> statement-breakpoint
CREATE INDEX `food_barcode_idx` ON `food` (`barcode`);--> statement-breakpoint
CREATE INDEX `food_name_idx` ON `food` (`name`);--> statement-breakpoint
CREATE TABLE `recipe_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`food_id` integer NOT NULL,
	`grams` real NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `food`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`food_id`) REFERENCES `food`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recipe_item_recipe_idx` ON `recipe_item` (`recipe_id`);