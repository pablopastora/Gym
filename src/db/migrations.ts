// ARCHIVO GENERADO por scripts/build-migrations.mjs — no editar a mano.
// Regenerar con: npm run db:generate

export const journal = {
  "entries": [
    {
      "idx": 0,
      "when": 1793644636890,
      "tag": "0000_init",
      "breakpoints": true
    },
    {
      "idx": 1,
      "when": 1793646556840,
      "tag": "0001_sesion_activa",
      "breakpoints": true
    },
    {
      "idx": 2,
      "when": 1793649448686,
      "tag": "0002_progresion",
      "breakpoints": true
    },
    {
      "idx": 3,
      "when": 1793689552744,
      "tag": "0003_video_wger",
      "breakpoints": true
    },
    {
      "idx": 4,
      "when": 1793742064072,
      "tag": "0004_hoy_kcal_sugerencias",
      "breakpoints": true
    },
    {
      "idx": 5,
      "when": 1793865489085,
      "tag": "0005_discos_superseries_plan",
      "breakpoints": true
    },
    {
      "idx": 6,
      "when": 1794153478657,
      "tag": "0006_cardio_acsm",
      "breakpoints": true
    },
    {
      "idx": 7,
      "when": 1794153780796,
      "tag": "0007_gasto_energetico",
      "breakpoints": true
    },
    {
      "idx": 8,
      "when": 1794154120168,
      "tag": "0008_diario_comidas",
      "breakpoints": true
    },
    {
      "idx": 9,
      "when": 1794155008251,
      "tag": "0009_preferencias_comida",
      "breakpoints": true
    }
  ]
};

export const migrations: Record<string, string> = {
  "m0000": "CREATE TABLE `app_meta` (\n\t`key` text PRIMARY KEY NOT NULL,\n\t`value` text NOT NULL\n);\n--> statement-breakpoint\nCREATE TABLE `body_measurement` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`date` text NOT NULL,\n\t`waist_cm` real,\n\t`chest_cm` real,\n\t`arm_cm` real,\n\t`thigh_cm` real,\n\t`hip_cm` real,\n\t`body_fat_pct` real,\n\t`note` text,\n\t`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL\n);\n--> statement-breakpoint\nCREATE UNIQUE INDEX `body_measurement_date_idx` ON `body_measurement` (`date`);--> statement-breakpoint\nCREATE TABLE `body_weight` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`date` text NOT NULL,\n\t`weight_kg` real NOT NULL,\n\t`note` text,\n\t`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL\n);\n--> statement-breakpoint\nCREATE UNIQUE INDEX `body_weight_date_idx` ON `body_weight` (`date`);--> statement-breakpoint\nCREATE TABLE `cardio_session` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`date` text NOT NULL,\n\t`type` text NOT NULL,\n\t`duration_min` real NOT NULL,\n\t`steps` integer,\n\t`distance_km` real,\n\t`notes` text,\n\t`workout_id` integer,\n\t`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,\n\tFOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE set null\n);\n--> statement-breakpoint\nCREATE INDEX `cardio_date_idx` ON `cardio_session` (`date`);--> statement-breakpoint\nCREATE TABLE `exercise` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`name_es` text NOT NULL,\n\t`name_en` text,\n\t`source` text NOT NULL,\n\t`curated` integer DEFAULT false NOT NULL,\n\t`primary_muscles` text NOT NULL,\n\t`secondary_muscles` text NOT NULL,\n\t`equipment` text,\n\t`category` text NOT NULL,\n\t`level` text,\n\t`body_region` text NOT NULL,\n\t`kind` text NOT NULL,\n\t`default_rest_s` integer,\n\t`instructions` text NOT NULL,\n\t`common_errors` text NOT NULL,\n\t`technique_note` text,\n\t`images` text NOT NULL,\n\t`video_url` text,\n\t`media_attribution` text,\n\t`is_favorite` integer DEFAULT false NOT NULL,\n\t`is_custom` integer DEFAULT false NOT NULL,\n\t`custom_photo_file` text,\n\t`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL\n);\n--> statement-breakpoint\nCREATE INDEX `exercise_name_idx` ON `exercise` (`name_es`);--> statement-breakpoint\nCREATE TABLE `exercise_progress` (\n\t`exercise_id` text PRIMARY KEY NOT NULL,\n\t`working_weight_kg` real,\n\t`stall_count` integer DEFAULT 0 NOT NULL,\n\t`last_suggestion` text,\n\t`updated_at` integer,\n\tFOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE cascade\n);\n--> statement-breakpoint\nCREATE TABLE `media_cache` (\n\t`url` text PRIMARY KEY NOT NULL,\n\t`file_name` text NOT NULL,\n\t`bytes` integer,\n\t`last_used_at` integer NOT NULL\n);\n--> statement-breakpoint\nCREATE TABLE `personal_record` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`exercise_id` text NOT NULL,\n\t`record_type` text NOT NULL,\n\t`value` real NOT NULL,\n\t`weight_kg` real,\n\t`reps` integer,\n\t`workout_id` integer,\n\t`workout_set_id` integer,\n\t`achieved_at` integer NOT NULL,\n\tFOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE cascade,\n\tFOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE set null,\n\tFOREIGN KEY (`workout_set_id`) REFERENCES `workout_set`(`id`) ON UPDATE no action ON DELETE set null\n);\n--> statement-breakpoint\nCREATE INDEX `personal_record_ex_idx` ON `personal_record` (`exercise_id`,`record_type`);--> statement-breakpoint\nCREATE TABLE `profile` (\n\t`id` integer PRIMARY KEY NOT NULL,\n\t`height_cm` real DEFAULT 185 NOT NULL,\n\t`start_weight_kg` real DEFAULT 95 NOT NULL,\n\t`goal_weight_kg` real,\n\t`goal_date` text,\n\t`age` integer,\n\t`sex` text,\n\t`injuries` text,\n\t`days_per_week` integer DEFAULT 4 NOT NULL,\n\t`increment_upper_kg` real DEFAULT 2.5 NOT NULL,\n\t`increment_lower_kg` real DEFAULT 5 NOT NULL,\n\t`deficit_mode` integer DEFAULT true NOT NULL,\n\t`rest_compound_s` integer DEFAULT 150 NOT NULL,\n\t`rest_accessory_s` integer DEFAULT 75 NOT NULL,\n\t`rest_abs_s` integer DEFAULT 50 NOT NULL,\n\t`last_deload_date` text,\n\t`updated_at` integer\n);\n--> statement-breakpoint\nCREATE TABLE `progress_photo` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`date` text NOT NULL,\n\t`view` text NOT NULL,\n\t`file_name` text NOT NULL,\n\t`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL\n);\n--> statement-breakpoint\nCREATE INDEX `progress_photo_date_idx` ON `progress_photo` (`date`);--> statement-breakpoint\nCREATE TABLE `reminder` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`weekday` integer NOT NULL,\n\t`hour` integer NOT NULL,\n\t`minute` integer DEFAULT 0 NOT NULL,\n\t`enabled` integer DEFAULT true NOT NULL,\n\t`notification_id` text\n);\n--> statement-breakpoint\nCREATE TABLE `routine` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`name` text NOT NULL,\n\t`notes` text,\n\t`is_active` integer DEFAULT false NOT NULL,\n\t`sort_order` integer DEFAULT 0 NOT NULL,\n\t`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL\n);\n--> statement-breakpoint\nCREATE TABLE `routine_day` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`routine_id` integer NOT NULL,\n\t`name` text NOT NULL,\n\t`sort_order` integer DEFAULT 0 NOT NULL,\n\t`is_optional` integer DEFAULT false NOT NULL,\n\t`cardio_note` text,\n\t`notes` text,\n\tFOREIGN KEY (`routine_id`) REFERENCES `routine`(`id`) ON UPDATE no action ON DELETE cascade\n);\n--> statement-breakpoint\nCREATE INDEX `routine_day_routine_idx` ON `routine_day` (`routine_id`);--> statement-breakpoint\nCREATE TABLE `routine_exercise` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`routine_day_id` integer NOT NULL,\n\t`exercise_id` text NOT NULL,\n\t`sort_order` integer DEFAULT 0 NOT NULL,\n\t`sets` integer DEFAULT 3 NOT NULL,\n\t`rep_min` integer DEFAULT 8 NOT NULL,\n\t`rep_max` integer DEFAULT 12 NOT NULL,\n\t`rest_s` integer,\n\t`warmup_sets` integer DEFAULT 0 NOT NULL,\n\t`notes` text,\n\t`superset_group` integer,\n\tFOREIGN KEY (`routine_day_id`) REFERENCES `routine_day`(`id`) ON UPDATE no action ON DELETE cascade,\n\tFOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action\n);\n--> statement-breakpoint\nCREATE INDEX `routine_exercise_day_idx` ON `routine_exercise` (`routine_day_id`);--> statement-breakpoint\nCREATE TABLE `workout` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`started_at` integer NOT NULL,\n\t`ended_at` integer,\n\t`date` text NOT NULL,\n\t`routine_day_id` integer,\n\t`name` text NOT NULL,\n\t`notes` text,\n\t`is_deload` integer DEFAULT false NOT NULL,\n\tFOREIGN KEY (`routine_day_id`) REFERENCES `routine_day`(`id`) ON UPDATE no action ON DELETE set null\n);\n--> statement-breakpoint\nCREATE INDEX `workout_date_idx` ON `workout` (`date`);--> statement-breakpoint\nCREATE TABLE `workout_exercise` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`workout_id` integer NOT NULL,\n\t`exercise_id` text NOT NULL,\n\t`sort_order` integer DEFAULT 0 NOT NULL,\n\t`rep_min` integer,\n\t`rep_max` integer,\n\t`rest_s` integer,\n\t`target_weight_kg` real,\n\t`notes` text,\n\t`superset_group` integer,\n\tFOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE cascade,\n\tFOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE no action\n);\n--> statement-breakpoint\nCREATE INDEX `workout_exercise_workout_idx` ON `workout_exercise` (`workout_id`);--> statement-breakpoint\nCREATE INDEX `workout_exercise_exercise_idx` ON `workout_exercise` (`exercise_id`);--> statement-breakpoint\nCREATE TABLE `workout_set` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`workout_exercise_id` integer NOT NULL,\n\t`sort_order` integer DEFAULT 0 NOT NULL,\n\t`set_type` text DEFAULT 'normal' NOT NULL,\n\t`weight_kg` real,\n\t`reps` integer,\n\t`rir` real,\n\t`rpe` real,\n\t`completed` integer DEFAULT false NOT NULL,\n\t`completed_at` integer,\n\tFOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercise`(`id`) ON UPDATE no action ON DELETE cascade\n);\n--> statement-breakpoint\nCREATE INDEX `workout_set_we_idx` ON `workout_set` (`workout_exercise_id`);",
  "m0001": "ALTER TABLE `profile` ADD `effort_metric` text DEFAULT 'rir' NOT NULL;--> statement-breakpoint\nALTER TABLE `profile` ADD `bar_kg` real DEFAULT 20 NOT NULL;",
  "m0002": "ALTER TABLE `profile` ADD `deload_until` text;--> statement-breakpoint\nALTER TABLE `profile` ADD `deload_snooze_until` text;--> statement-breakpoint\nALTER TABLE `workout_exercise` ADD `progression_action` text;--> statement-breakpoint\nALTER TABLE `workout_exercise` ADD `progression_delta_kg` real;--> statement-breakpoint\nALTER TABLE `workout_exercise` ADD `progression_note` text;",
  "m0003": "ALTER TABLE `exercise` ADD `video_attribution` text;--> statement-breakpoint\nALTER TABLE `exercise` ADD `video_checked_at` integer;",
  "m0004": "CREATE TABLE `routine_suggestion` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`week_start` text NOT NULL,\n\t`rule` text NOT NULL,\n\t`action` text NOT NULL,\n\t`routine_id` integer,\n\t`routine_day_id` integer,\n\t`routine_exercise_id` integer,\n\t`exercise_id` text,\n\t`suggested_exercise_id` text,\n\t`sets_delta` integer,\n\t`muscle` text,\n\t`reason` text NOT NULL,\n\t`status` text DEFAULT 'pendiente' NOT NULL,\n\t`applied_summary` text,\n\t`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,\n\t`decided_at` integer,\n\tFOREIGN KEY (`routine_id`) REFERENCES `routine`(`id`) ON UPDATE no action ON DELETE set null,\n\tFOREIGN KEY (`routine_day_id`) REFERENCES `routine_day`(`id`) ON UPDATE no action ON DELETE set null,\n\tFOREIGN KEY (`routine_exercise_id`) REFERENCES `routine_exercise`(`id`) ON UPDATE no action ON DELETE set null\n);\n--> statement-breakpoint\nCREATE INDEX `routine_suggestion_week_idx` ON `routine_suggestion` (`week_start`);--> statement-breakpoint\nALTER TABLE `cardio_session` ADD `kcal` real;--> statement-breakpoint\nALTER TABLE `profile` ADD `training_weekdays` text;--> statement-breakpoint\nALTER TABLE `workout` ADD `kcal` real;--> statement-breakpoint\nALTER TABLE `workout` ADD `met` real;",
  "m0005": "CREATE TABLE `day_override` (\n\t`date` text PRIMARY KEY NOT NULL,\n\t`training` integer NOT NULL\n);\n--> statement-breakpoint\nALTER TABLE `exercise` ADD `role_override` text;--> statement-breakpoint\nALTER TABLE `profile` ADD `available_plates` text;--> statement-breakpoint\nALTER TABLE `profile` ADD `auto_set_plan` integer DEFAULT true NOT NULL;--> statement-breakpoint\nALTER TABLE `profile` ADD `meso_start` text;--> statement-breakpoint\nALTER TABLE `routine_exercise` ADD `top_set` integer DEFAULT false NOT NULL;--> statement-breakpoint\nALTER TABLE `workout_exercise` ADD `role` text;--> statement-breakpoint\nALTER TABLE `workout_exercise` ADD `plan_note` text;--> statement-breakpoint\nALTER TABLE `workout_set` ADD `target_rir` real;",
  "m0006": "ALTER TABLE `cardio_session` ADD `speed_kmh` real;--> statement-breakpoint\nALTER TABLE `cardio_session` ADD `incline_pct` real;--> statement-breakpoint\nALTER TABLE `cardio_session` ADD `intensity` text;--> statement-breakpoint\nALTER TABLE `cardio_session` ADD `met` real;--> statement-breakpoint\nALTER TABLE `cardio_session` ADD `kcal_method` text;",
  "m0007": "CREATE TABLE `energy_adjustment` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`created_date` text NOT NULL,\n\t`from_date` text NOT NULL,\n\t`to_date` text NOT NULL,\n\t`logged_days` integer NOT NULL,\n\t`avg_intake` real NOT NULL,\n\t`avg_estimated` real NOT NULL,\n\t`weight_change_kg` real NOT NULL,\n\t`observed_tdee` real NOT NULL,\n\t`delta_kcal` real NOT NULL,\n\t`status` text DEFAULT 'pendiente' NOT NULL,\n\t`decided_at` integer,\n\t`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL\n);\n--> statement-breakpoint\nALTER TABLE `profile` ADD `activity_level` text DEFAULT 'ligero' NOT NULL;--> statement-breakpoint\nALTER TABLE `profile` ADD `target_rate_kg_week` real;--> statement-breakpoint\nALTER TABLE `profile` ADD `kcal_target_manual` integer;--> statement-breakpoint\nALTER TABLE `profile` ADD `protein_g_per_kg` real DEFAULT 2 NOT NULL;--> statement-breakpoint\nALTER TABLE `profile` ADD `fat_g_per_kg` real DEFAULT 0.7 NOT NULL;--> statement-breakpoint\nALTER TABLE `profile` ADD `tdee_adjust_kcal` real DEFAULT 0 NOT NULL;",
  "m0008": "CREATE TABLE `diary_entry` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`date` text NOT NULL,\n\t`meal` text NOT NULL,\n\t`food_id` integer,\n\t`name` text NOT NULL,\n\t`quantity` real,\n\t`unit` text,\n\t`grams` real,\n\t`kcal` real NOT NULL,\n\t`protein` real DEFAULT 0 NOT NULL,\n\t`carbs` real DEFAULT 0 NOT NULL,\n\t`fat` real DEFAULT 0 NOT NULL,\n\t`fiber` real DEFAULT 0 NOT NULL,\n\t`sort_order` integer DEFAULT 0 NOT NULL,\n\t`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,\n\tFOREIGN KEY (`food_id`) REFERENCES `food`(`id`) ON UPDATE no action ON DELETE set null\n);\n--> statement-breakpoint\nCREATE INDEX `diary_date_idx` ON `diary_entry` (`date`);--> statement-breakpoint\nCREATE TABLE `food` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`base_key` text,\n\t`barcode` text,\n\t`source` text NOT NULL,\n\t`name` text NOT NULL,\n\t`brand` text,\n\t`category` text DEFAULT 'otros' NOT NULL,\n\t`tags` text DEFAULT '[]' NOT NULL,\n\t`kcal` real NOT NULL,\n\t`protein` real NOT NULL,\n\t`carbs` real NOT NULL,\n\t`fat` real NOT NULL,\n\t`fiber` real,\n\t`salt` real,\n\t`unit_label` text,\n\t`unit_g` real,\n\t`serving_g` real,\n\t`servings` real,\n\t`is_favorite` integer DEFAULT false NOT NULL,\n\t`edited` integer DEFAULT false NOT NULL,\n\t`archived` integer DEFAULT false NOT NULL,\n\t`last_used_at` integer,\n\t`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,\n\t`updated_at` integer\n);\n--> statement-breakpoint\nCREATE UNIQUE INDEX `food_base_key_idx` ON `food` (`base_key`);--> statement-breakpoint\nCREATE INDEX `food_barcode_idx` ON `food` (`barcode`);--> statement-breakpoint\nCREATE INDEX `food_name_idx` ON `food` (`name`);--> statement-breakpoint\nCREATE TABLE `recipe_item` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`recipe_id` integer NOT NULL,\n\t`food_id` integer NOT NULL,\n\t`grams` real NOT NULL,\n\t`sort_order` integer DEFAULT 0 NOT NULL,\n\tFOREIGN KEY (`recipe_id`) REFERENCES `food`(`id`) ON UPDATE no action ON DELETE cascade,\n\tFOREIGN KEY (`food_id`) REFERENCES `food`(`id`) ON UPDATE no action ON DELETE cascade\n);\n--> statement-breakpoint\nCREATE INDEX `recipe_item_recipe_idx` ON `recipe_item` (`recipe_id`);",
  "m0009": "ALTER TABLE `food` ADD `pref` text;--> statement-breakpoint\nALTER TABLE `food` ADD `in_pantry` integer DEFAULT false NOT NULL;--> statement-breakpoint\nALTER TABLE `profile` ADD `diet_flags` text DEFAULT '[]' NOT NULL;"
};

const bundle = { journal, migrations };
export default bundle;
