/**
 * Rutina por defecto (editable desde la app). Orientada a recomposición en déficit:
 * básicos pesados en rangos medios-bajos para mantener fuerza y accesorios en
 * rangos más altos para volumen. `restS` vacío = descanso por defecto según tipo.
 */
export interface DefaultRoutineExercise {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restS?: number;
  warmupSets?: number;
  notes?: string;
}

export interface DefaultRoutineDay {
  name: string;
  isOptional?: boolean;
  cardioNote?: string;
  exercises: DefaultRoutineExercise[];
}

export const DEFAULT_ROUTINE_NAME = 'Recomposición 4-5 días';

export const DEFAULT_ROUTINE: DefaultRoutineDay[] = [
  {
    name: 'Día 1 · Pecho + tríceps',
    cardioNote: 'Opcional: 10-15 min de cardio suave al final.',
    exercises: [
      { exerciseId: 'Barbell_Bench_Press_-_Medium_Grip', sets: 4, repMin: 6, repMax: 8, warmupSets: 2 },
      { exerciseId: 'Incline_Dumbbell_Press', sets: 3, repMin: 8, repMax: 10, warmupSets: 1 },
      { exerciseId: 'Flat_Bench_Cable_Flyes', sets: 3, repMin: 12, repMax: 15 },
      { exerciseId: 'EZ-Bar_Skullcrusher', sets: 3, repMin: 8, repMax: 12 },
      { exerciseId: 'Triceps_Pushdown_-_Rope_Attachment', sets: 3, repMin: 10, repMax: 15 },
      { exerciseId: 'Cable_Rope_Overhead_Triceps_Extension', sets: 2, repMin: 12, repMax: 15 },
    ],
  },
  {
    name: 'Día 2 · Espalda + bíceps',
    cardioNote: 'Opcional: 10-15 min de cardio suave al final.',
    exercises: [
      { exerciseId: 'Wide-Grip_Lat_Pulldown', sets: 4, repMin: 8, repMax: 10, warmupSets: 1 },
      { exerciseId: 'Bent_Over_Barbell_Row', sets: 4, repMin: 6, repMax: 8, warmupSets: 2 },
      { exerciseId: 'Seated_Cable_Rows', sets: 3, repMin: 8, repMax: 12 },
      { exerciseId: 'One-Arm_Dumbbell_Row', sets: 3, repMin: 10, repMax: 12 },
      { exerciseId: 'Face_Pull', sets: 3, repMin: 12, repMax: 15 },
      { exerciseId: 'EZ-Bar_Curl', sets: 3, repMin: 8, repMax: 12 },
      { exerciseId: 'Hammer_Curls', sets: 3, repMin: 10, repMax: 12 },
    ],
  },
  {
    name: 'Día 3 · Pierna',
    exercises: [
      { exerciseId: 'Barbell_Squat', sets: 4, repMin: 5, repMax: 8, warmupSets: 3 },
      { exerciseId: 'Romanian_Deadlift', sets: 3, repMin: 8, repMax: 10, warmupSets: 1 },
      { exerciseId: 'Leg_Press', sets: 3, repMin: 10, repMax: 12 },
      { exerciseId: 'Lying_Leg_Curls', sets: 3, repMin: 10, repMax: 12 },
      { exerciseId: 'Leg_Extensions', sets: 3, repMin: 12, repMax: 15 },
      { exerciseId: 'Standing_Calf_Raises', sets: 4, repMin: 10, repMax: 15 },
    ],
  },
  {
    name: 'Día 4 · Hombro + abdominales',
    cardioNote: 'Opcional: 10-15 min de cardio suave al final.',
    exercises: [
      { exerciseId: 'Standing_Military_Press', sets: 4, repMin: 6, repMax: 8, warmupSets: 2 },
      { exerciseId: 'Dumbbell_Shoulder_Press', sets: 3, repMin: 8, repMax: 12 },
      { exerciseId: 'Side_Lateral_Raise', sets: 4, repMin: 12, repMax: 15 },
      { exerciseId: 'Reverse_Flyes', sets: 3, repMin: 12, repMax: 15 },
      { exerciseId: 'Dumbbell_Shrug', sets: 3, repMin: 10, repMax: 12 },
      { exerciseId: 'Cable_Crunch', sets: 3, repMin: 10, repMax: 15 },
      { exerciseId: 'Hanging_Leg_Raise', sets: 3, repMin: 10, repMax: 15 },
    ],
  },
  {
    name: 'Día 5 · Pierna 2 / puntos débiles + cardio',
    isOptional: true,
    cardioNote: 'Cardio LISS 25-35 min (cinta inclinada, bici o elíptica) al terminar.',
    exercises: [
      { exerciseId: 'Barbell_Hip_Thrust', sets: 4, repMin: 8, repMax: 12, warmupSets: 1 },
      { exerciseId: 'Hack_Squat', sets: 3, repMin: 8, repMax: 12, warmupSets: 1 },
      { exerciseId: 'Split_Squat_with_Dumbbells', sets: 3, repMin: 8, repMax: 12 },
      { exerciseId: 'Seated_Leg_Curl', sets: 3, repMin: 10, repMax: 15 },
      { exerciseId: 'Seated_Calf_Raise', sets: 3, repMin: 12, repMax: 15 },
      { exerciseId: 'Cable_Seated_Lateral_Raise', sets: 3, repMin: 12, repMax: 15 },
    ],
  },
];
