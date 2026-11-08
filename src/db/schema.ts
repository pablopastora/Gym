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
  /** Días de entreno de la semana (1 = lunes … 7 = domingo). null = según días/semana. */
  trainingWeekdays: text('training_weekdays', { mode: 'json' }).$type<number[]>(),
  /** Discos disponibles (kg, de cada par). null = juego estándar. */
  availablePlates: text('available_plates', { mode: 'json' }).$type<number[]>(),
  /** Plan automático de series (tipo de serie, calentamientos, RIR objetivo). */
  autoSetPlan: integer('auto_set_plan', { mode: 'boolean' }).notNull().default(true),
  /** Lunes en que empezó el mesociclo actual (si no hay descarga previa). */
  mesoStart: text('meso_start'),
  /** Actividad diaria fuera del ejercicio (factor sobre el basal). */
  activityLevel: text('activity_level', { enum: ['sedentario', 'ligero', 'activo'] }).notNull().default('ligero'),
  /** Ritmo de pérdida (kg/semana). null = según el objetivo de peso y fecha. */
  targetRateKgWeek: real('target_rate_kg_week'),
  /** Objetivo calórico manual (kcal/día). null = calculado. */
  kcalTargetManual: integer('kcal_target_manual'),
  proteinGPerKg: real('protein_g_per_kg').notNull().default(2),
  fatGPerKg: real('fat_g_per_kg').notNull().default(0.7),
  /** Recalibración del gasto aceptada en los ajustes sugeridos (kcal/día). */
  tdeeAdjustKcal: real('tdee_adjust_kcal').notNull().default(0),
  /** Preferencias de dieta para el recomendador (vegetariano, sin lactosa…). */
  dietFlags: text('diet_flags', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
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
    /** Autor y licencia del vídeo (wger, CC-BY-SA). */
    videoAttribution: text('video_attribution'),
    /** Cuándo se buscó vídeo en wger (para no repetir la búsqueda en cada visita). */
    videoCheckedAt: integer('video_checked_at'),
    mediaAttribution: text('media_attribution'),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    customPhotoFile: text('custom_photo_file'),
    /** Rol elegido por el usuario (null = automático). */
    roleOverride: text('role_override').$type<ExerciseRole>(),
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
    /** Básicos: serie top + series de descarga (−8 a −10 %). */
    topSet: integer('top_set', { mode: 'boolean' }).notNull().default(false),
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
    /** Kcal estimadas (MET × peso × horas efectivas) y MET usado. */
    kcal: real('kcal'),
    met: real('met'),
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
    /** Rol usado por el plan automático y su explicación. */
    role: text('role').$type<ExerciseRole>(),
    planNote: text('plan_note'),
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

/** «backoff»: serie de descarga tras la serie top (no cuenta para la progresión). */
export type SetType = 'calentamiento' | 'normal' | 'fallo' | 'drop' | 'backoff';
export type ExerciseRole = 'basico' | 'accesorio' | 'aislamiento';

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
    /** RIR objetivo del plan automático. */
    targetRir: real('target_rir'),
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
    /** Kcal estimadas (brutas) según tipo, duración, velocidad, pendiente e intensidad. */
    kcal: real('kcal'),
    /** Velocidad media (km/h): la indicada o la calculada con distancia/ritmo. */
    speedKmh: real('speed_kmh'),
    /** Pendiente (%), en cinta o al caminar/correr. */
    inclinePct: real('incline_pct'),
    intensity: text('intensity', { enum: ['suave', 'moderada', 'intensa'] }),
    /** MET equivalente usado. */
    met: real('met'),
    /** Método del cálculo: ecuaciones ACSM o MET. null = calculado con la versión antigua. */
    kcalMethod: text('kcal_method', { enum: ['acsm', 'met'] }),
    workoutId: integer('workout_id').references(() => workout.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('cardio_date_idx').on(t.date)],
);

/** Cambios puntuales del calendario: un día concreto pasa a ser de entreno o de descanso. */
export const dayOverride = sqliteTable('day_override', {
  date: text('date').primaryKey(),
  training: integer('training', { mode: 'boolean' }).notNull(),
});

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

export type SuggestionRule = 'refuerzo' | 'avance' | 'equilibrio';
export type SuggestionAction = 'sustituir' | 'anadir' | 'series';
export type SuggestionStatus = 'pendiente' | 'aceptada' | 'rechazada' | 'caducada';

/** Sugerencias semanales de ajuste de la rutina (y su historial). */
export const routineSuggestion = sqliteTable(
  'routine_suggestion',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Lunes de la semana en que se generó. */
    weekStart: text('week_start').notNull(),
    rule: text('rule').$type<SuggestionRule>().notNull(),
    action: text('action').$type<SuggestionAction>().notNull(),
    routineId: integer('routine_id').references(() => routine.id, { onDelete: 'set null' }),
    routineDayId: integer('routine_day_id').references(() => routineDay.id, { onDelete: 'set null' }),
    routineExerciseId: integer('routine_exercise_id').references(() => routineExercise.id, { onDelete: 'set null' }),
    /** Ejercicio afectado (el que se sustituye o al que se añaden series). */
    exerciseId: text('exercise_id'),
    /** Ejercicio propuesto (al sustituir o añadir). */
    suggestedExerciseId: text('suggested_exercise_id'),
    setsDelta: integer('sets_delta'),
    muscle: text('muscle'),
    reason: text('reason').notNull(),
    status: text('status').$type<SuggestionStatus>().notNull().default('pendiente'),
    /** Descripción del cambio aplicado (historial). */
    appliedSummary: text('applied_summary'),
    createdAt: createdAt(),
    decidedAt: integer('decided_at'),
  },
  (t) => [index('routine_suggestion_week_idx').on(t.weekStart)],
);

export type RoutineSuggestion = typeof routineSuggestion.$inferSelect;
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

/** Ajustes sugeridos del gasto estimado (comparando ingesta y cambio de peso). */
export const energyAdjustment = sqliteTable('energy_adjustment', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdDate: text('created_date').notNull(),
  fromDate: text('from_date').notNull(),
  toDate: text('to_date').notNull(),
  loggedDays: integer('logged_days').notNull(),
  avgIntake: real('avg_intake').notNull(),
  avgEstimated: real('avg_estimated').notNull(),
  weightChangeKg: real('weight_change_kg').notNull(),
  observedTdee: real('observed_tdee').notNull(),
  deltaKcal: real('delta_kcal').notNull(),
  status: text('status', { enum: ['pendiente', 'aceptado', 'rechazado'] }).notNull().default('pendiente'),
  decidedAt: integer('decided_at'),
  createdAt: createdAt(),
});

export type MealKey = 'desayuno' | 'comida' | 'merienda' | 'cena' | 'snacks';
export type FoodSource = 'base' | 'off' | 'propio' | 'receta';
export type QuantityUnit = 'g' | 'unidad' | 'racion';
export type FoodPref = 'gusta' | 'no_gusta' | 'alergia';

/**
 * Alimentos: lista local inicial (USDA SR28), productos de Open Food Facts cacheados,
 * alimentos propios y recetas. Valores nutricionales por 100 g.
 */
export const food = sqliteTable(
  'food',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Clave estable de los alimentos de la lista local (null en el resto). */
    baseKey: text('base_key'),
    barcode: text('barcode'),
    source: text('source').$type<FoodSource>().notNull(),
    name: text('name').notNull(),
    brand: text('brand'),
    category: text('category').notNull().default('otros'),
    tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
    kcal: real('kcal').notNull(),
    protein: real('protein').notNull(),
    carbs: real('carbs').notNull(),
    fat: real('fat').notNull(),
    fiber: real('fiber'),
    salt: real('salt'),
    /** Unidad natural («1 huevo») y sus gramos. */
    unitLabel: text('unit_label'),
    unitG: real('unit_g'),
    /** Ración habitual en gramos. */
    servingG: real('serving_g'),
    /** Recetas: número de raciones de la receta completa. */
    servings: real('servings'),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    /** Preferencia: me gusta, no me gusta o alergia/intolerancia (estas dos se excluyen siempre). */
    pref: text('pref').$type<FoodPref>(),
    /** Lo tengo en casa (el recomendador lo prioriza). */
    inPantry: integer('in_pantry', { mode: 'boolean' }).notNull().default(false),
    /** El usuario ha editado un alimento de la lista local: no se sobrescribe al actualizarla. */
    edited: integer('edited', { mode: 'boolean' }).notNull().default(false),
    /** Oculto (alimento borrado que sigue en entradas antiguas del diario). */
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
    lastUsedAt: integer('last_used_at'),
    createdAt: createdAt(),
    updatedAt: integer('updated_at'),
  },
  (t) => [uniqueIndex('food_base_key_idx').on(t.baseKey), index('food_barcode_idx').on(t.barcode), index('food_name_idx').on(t.name)],
);

/** Ingredientes de una receta (la receta es un `food` con source = 'receta'). */
export const recipeItem = sqliteTable(
  'recipe_item',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    recipeId: integer('recipe_id')
      .notNull()
      .references(() => food.id, { onDelete: 'cascade' }),
    foodId: integer('food_id')
      .notNull()
      .references(() => food.id, { onDelete: 'cascade' }),
    grams: real('grams').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('recipe_item_recipe_idx').on(t.recipeId)],
);

/**
 * Entradas del diario de comidas. Guardan los valores calculados (instantánea),
 * para que editar o borrar un alimento no cambie lo ya registrado.
 */
export const diaryEntry = sqliteTable(
  'diary_entry',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    meal: text('meal').$type<MealKey>().notNull(),
    /** null = «calorías rápidas» o alimento borrado. */
    foodId: integer('food_id').references(() => food.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    quantity: real('quantity'),
    unit: text('unit').$type<QuantityUnit>(),
    grams: real('grams'),
    kcal: real('kcal').notNull(),
    protein: real('protein').notNull().default(0),
    carbs: real('carbs').notNull().default(0),
    fat: real('fat').notNull().default(0),
    fiber: real('fiber').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index('diary_date_idx').on(t.date)],
);
