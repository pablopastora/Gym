/**
 * Esquema de la base de datos local (SQLite) definido con Drizzle.
 *
 * Convenciones:
 *  - Fechas de calendario como texto ISO `YYYY-MM-DD` (zona horaria local).
 *  - Instantes como milisegundos epoch (`integer`).
 *  - Listas (músculos, instrucciones, imágenes) como JSON en columnas `text`.
 *  - Pesos siempre en kg; la conversión de unidades es solo de presentación.
 *
 * Tras modificar este archivo: `npm run db:generate` (genera SQL + migrations.ts).
 */
import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const createdAt = () =>
  integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

/** Clave-valor para metadatos internos (versión de datos iniciales, etc.). */
export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/** Perfil del único usuario (fila con id = 1). */
export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey(),
  heightCm: real('height_cm').notNull().default(185),
  startWeightKg: real('start_weight_kg').notNull().default(95),
  goalWeightKg: real('goal_weight_kg'),
  goalDate: text('goal_date'),
  age: integer('age'),
  sex: text('sex', { enum: ['hombre', 'mujer'] }),
  injuries: text('injuries'),
  daysPerWeek: integer('days_per_week').notNull().default(4),
  incrementUpperKg: real('increment_upper_kg').notNull().default(2.5),
  incrementLowerKg: real('increment_lower_kg').notNull().default(5),
  /** Ajuste conservador de la progresión por estar en déficit calórico. */
  deficitMode: integer('deficit_mode', { mode: 'boolean' }).notNull().default(true),
  restCompoundS: integer('rest_compound_s').notNull().default(150),
  restAccessoryS: integer('rest_accessory_s').notNull().default(75),
  restAbsS: integer('rest_abs_s').notNull().default(50),
  lastDeloadDate: text('last_deload_date'),
  /** Métrica de esfuerzo que se pide en cada serie. */
  effortMetric: text('effort_metric', { enum: ['rir', 'rpe', 'ninguno'] }).notNull().default('rir'),
  /** Peso de la barra olímpica para la calculadora de calentamiento. */
  barKg: real('bar_kg').notNull().default(20),
  /** Semana de descarga en curso: activa hasta esta fecha (incluida). */
  deloadUntil: text('deload_until'),
  /** No volver a sugerir la descarga hasta esta fecha. */
  deloadSnoozeUntil: text('deload_snooze_until'),
  updatedAt: integer('updated_at'),
});

export const bodyWeight = sqliteTable(
  'body_weight',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    weightKg: real('weight_kg').notNull(),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('body_weight_date_idx').on(t.date)],
);

export const bodyMeasurement = sqliteTable(
  'body_measurement',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    waistCm: real('waist_cm'),
    chestCm: real('chest_cm'),
    armCm: real('arm_cm'),
    thighCm: real('thigh_cm'),
    hipCm: real('hip_cm'),
    bodyFatPct: real('body_fat_pct'),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('body_measurement_date_idx').on(t.date)],
);

export const progressPhoto = sqliteTable(
  'progress_photo',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    view: text('view', { enum: ['frontal', 'lateral', 'espalda'] }).notNull(),
    /** Ruta relativa dentro del directorio de documentos de la app. */
    fileName: text('file_name').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('progress_photo_date_idx').on(t.date)],
);

export type ExerciseKind = 'compuesto' | 'accesorio' | 'abs' | 'cardio' | 'estiramiento';
export type BodyRegion = 'superior' | 'inferior' | 'core' | 'cuerpo_completo';

export const exercise = sqliteTable(
  'exercise',
  {
    /** Para free-exercise-db se usa su id original; los propios llevan prefijo `u_`. */
    id: text('id').primaryKey(),
    nameEs: text('name_es').notNull(),
    nameEn: text('name_en'),
    source: text('source', { enum: ['free-exercise-db', 'wger', 'usuario'] }).notNull(),
    /** true si el nombre/instrucciones han sido traducidos y revisados en español. */
    curated: integer('curated', { mode: 'boolean' }).notNull().default(false),
    primaryMuscles: text('primary_muscles', { mode: 'json' }).$type<string[]>().notNull(),
    secondaryMuscles: text('secondary_muscles', { mode: 'json' }).$type<string[]>().notNull(),
    equipment: text('equipment'),
    category: text('category').notNull(),
    level: text('level'),
    bodyRegion: text('body_region').$type<BodyRegion>().notNull(),
    kind: text('kind').$type<ExerciseKind>().notNull(),
    /** Descanso específico; null = usar el por defecto del perfil según `kind`. */
    defaultRestS: integer('default_rest_s'),
    instructions: text('instructions', { mode: 'json' }).$type<string[]>().notNull(),
    commonErrors: text('common_errors', { mode: 'json' }).$type<string[]>().notNull(),
    techniqueNote: text('technique_note'),
    /** Rutas relativas de imágenes en la fuente (free-exercise-db) o URLs absolutas. */
    images: text('images', { mode: 'json' }).$type<string[]>().notNull(),
    videoUrl: text('video_url'),
    mediaAttribution: text('media_attribution'),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    customPhotoFile: text('custom_photo_file'),
    createdAt: createdAt(),
  },
  (t) => [index('exercise_name_idx').on(t.nameEs)],
);

export const routine = sqliteTable('routine', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
});

export const routineDay = sqliteTable(
  'routine_day',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    routineId: integer('routine_id')
      .notNull()
      .references(() => routine.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isOptional: integer('is_optional', { mode: 'boolean' }).notNull().default(false),
    /** Sugerencia de cardio para ese día (texto libre). */
    cardioNote: text('cardio_note'),
    notes: text('notes'),
  },
  (t) => [index('routine_day_routine_idx').on(t.routineId)],
);

export const routineExercise = sqliteTable(
  'routine_exercise',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    routineDayId: integer('routine_day_id')
      .notNull()
      .references(() => routineDay.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id),
    sortOrder: integer('sort_order').notNull().default(0),
    sets: integer('sets').notNull().default(3),
    repMin: integer('rep_min').notNull().default(8),
    repMax: integer('rep_max').notNull().default(12),
    restS: integer('rest_s'),
    warmupSets: integer('warmup_sets').notNull().default(0),
    notes: text('notes'),
    supersetGroup: integer('superset_group'),
  },
  (t) => [index('routine_exercise_day_idx').on(t.routineDayId)],
);

export const workout = sqliteTable(
  'workout',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'),
    /** Fecha local del entreno, para calendario y rachas. */
    date: text('date').notNull(),
    routineDayId: integer('routine_day_id').references(() => routineDay.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    notes: text('notes'),
    isDeload: integer('is_deload', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('workout_date_idx').on(t.date)],
);

export const workoutExercise = sqliteTable(
  'workout_exercise',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workoutId: integer('workout_id')
      .notNull()
      .references(() => workout.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id),
    sortOrder: integer('sort_order').notNull().default(0),
    repMin: integer('rep_min'),
    repMax: integer('rep_max'),
    restS: integer('rest_s'),
    targetWeightKg: real('target_weight_kg'),
    /** Sugerencia de doble progresión calculada al empezar la sesión. */
    progressionAction: text('progression_action').$type<ProgressionAction>(),
    progressionDeltaKg: real('progression_delta_kg'),
    progressionNote: text('progression_note'),
    notes: text('notes'),
    supersetGroup: integer('superset_group'),
  },
  (t) => [
    index('workout_exercise_workout_idx').on(t.workoutId),
    index('workout_exercise_exercise_idx').on(t.exerciseId),
  ],
);

export type ProgressionAction =
  | 'primera_vez'
  | 'subir'
  | 'mantener'
  | 'consolidar'
  | 'estancado'
  | 'lastre'
  | 'descarga';

export type SetType = 'calentamiento' | 'normal' | 'fallo' | 'drop';

export const workoutSet = sqliteTable(
  'workout_set',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workoutExerciseId: integer('workout_exercise_id')
      .notNull()
      .references(() => workoutExercise.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    setType: text('set_type').$type<SetType>().notNull().default('normal'),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
    rir: real('rir'),
    rpe: real('rpe'),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
    completedAt: integer('completed_at'),
  },
  (t) => [index('workout_set_we_idx').on(t.workoutExerciseId)],
);

/** Estado de la doble progresión por ejercicio (se recalcula al terminar cada sesión). */
export const exerciseProgress = sqliteTable('exercise_progress', {
  exerciseId: text('exercise_id')
    .primaryKey()
    .references(() => exercise.id, { onDelete: 'cascade' }),
  workingWeightKg: real('working_weight_kg'),
  stallCount: integer('stall_count').notNull().default(0),
  lastSuggestion: text('last_suggestion'),
  updatedAt: integer('updated_at'),
});

export type RecordType = 'peso_max' | 'e1rm' | 'volumen';

export const personalRecord = sqliteTable(
  'personal_record',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id, { onDelete: 'cascade' }),
    recordType: text('record_type').$type<RecordType>().notNull(),
    value: real('value').notNull(),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
    workoutId: integer('workout_id').references(() => workout.id, { onDelete: 'set null' }),
    workoutSetId: integer('workout_set_id').references(() => workoutSet.id, {
      onDelete: 'set null',
    }),
    achievedAt: integer('achieved_at').notNull(),
  },
  (t) => [index('personal_record_ex_idx').on(t.exerciseId, t.recordType)],
);

export const cardioSession = sqliteTable(
  'cardio_session',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    type: text('type').notNull(),
    durationMin: real('duration_min').notNull(),
    steps: integer('steps'),
    distanceKm: real('distance_km'),
    notes: text('notes'),
    workoutId: integer('workout_id').references(() => workout.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('cardio_date_idx').on(t.date)],
);

export const reminder = sqliteTable('reminder', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** 1 = lunes … 7 = domingo. */
  weekday: integer('weekday').notNull(),
  hour: integer('hour').notNull(),
  minute: integer('minute').notNull().default(0),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  notificationId: text('notification_id'),
});

export const mediaCache = sqliteTable('media_cache', {
  url: text('url').primaryKey(),
  fileName: text('file_name').notNull(),
  bytes: integer('bytes'),
  lastUsedAt: integer('last_used_at').notNull(),
});

export type Profile = typeof profile.$inferSelect;
export type Exercise = typeof exercise.$inferSelect;
export type NewExercise = typeof exercise.$inferInsert;
export type Routine = typeof routine.$inferSelect;
export type RoutineDay = typeof routineDay.$inferSelect;
export type RoutineExercise = typeof routineExercise.$inferSelect;
export type Workout = typeof workout.$inferSelect;
export type WorkoutExercise = typeof workoutExercise.$inferSelect;
export type WorkoutSet = typeof workoutSet.$inferSelect;
export type BodyWeight = typeof bodyWeight.$inferSelect;
export type BodyMeasurement = typeof bodyMeasurement.$inferSelect;
export type ProgressPhoto = typeof progressPhoto.$inferSelect;
export type CardioSession = typeof cardioSession.$inferSelect;
export type PersonalRecord = typeof personalRecord.$inferSelect;
