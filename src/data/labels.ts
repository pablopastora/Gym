/** Traducciones al español de los valores de free-exercise-db. */

export const MUSCLE_LABELS: Record<string, string> = {
  abdominals: 'Abdominales',
  abductors: 'Abductores',
  adductors: 'Aductores',
  biceps: 'Bíceps',
  calves: 'Gemelos',
  chest: 'Pecho',
  forearms: 'Antebrazos',
  glutes: 'Glúteos',
  hamstrings: 'Isquiotibiales',
  lats: 'Dorsales',
  'lower back': 'Zona lumbar',
  'middle back': 'Espalda media',
  neck: 'Cuello',
  quadriceps: 'Cuádriceps',
  shoulders: 'Hombros',
  traps: 'Trapecios',
  triceps: 'Tríceps',
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  cable: 'Polea',
  machine: 'Máquina',
  'body only': 'Peso corporal',
  kettlebells: 'Kettlebell',
  bands: 'Bandas',
  'medicine ball': 'Balón medicinal',
  'exercise ball': 'Fitball',
  'e-z curl bar': 'Barra Z',
  'foam roll': 'Foam roller',
  other: 'Otro',
};

export const CATEGORY_LABELS: Record<string, string> = {
  strength: 'Fuerza',
  stretching: 'Estiramiento',
  plyometrics: 'Pliometría',
  powerlifting: 'Powerlifting',
  'olympic weightlifting': 'Halterofilia',
  strongman: 'Strongman',
  cardio: 'Cardio',
};

export const KIND_LABELS = {
  compuesto: 'Básico / compuesto',
  accesorio: 'Accesorio',
  abs: 'Abdominales',
  cardio: 'Cardio',
  estiramiento: 'Estiramiento',
} as const;

export const muscleLabel = (m: string) => MUSCLE_LABELS[m] ?? m;
export const equipmentLabel = (e: string | null | undefined) =>
  e ? (EQUIPMENT_LABELS[e] ?? e) : 'Sin equipamiento';

export const LOWER_BODY_MUSCLES = new Set([
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'adductors',
  'abductors',
]);
