/**
 * Estimación de kcal del cardio.
 *
 * - Caminar / correr / cinta con velocidad: ecuaciones metabólicas del ACSM
 *   (ACSM's Guidelines for Exercise Testing and Prescription):
 *     caminar: VO2 = 0,1·v + 1,8·v·pendiente + 3,5
 *     correr:  VO2 = 0,2·v + 0,9·v·pendiente + 3,5
 *   con v en m/min, pendiente en fracción y VO2 en ml/kg/min.
 *   Hasta 6,5 km/h se usa la de caminar, desde 8 km/h la de correr y entre medias
 *   se interpola linealmente.
 *   kcal = VO2 × peso (kg) × minutos / 1000 × 5 (≈ 5 kcal por litro de O2).
 * - Resto de tipos (bici, elíptica, remo…): MET según tipo e intensidad
 *   (Compendium of Physical Activities): kcal = MET × peso × horas.
 *
 * Son kcal brutas (incluyen lo que gastarías en reposo esos minutos).
 */

export type CardioIntensity = 'suave' | 'moderada' | 'intensa';
export type CardioMethod = 'acsm' | 'met';
/** Cómo se describe el ritmo de caminar/correr. */
export type PaceInput = 'velocidad' | 'distancia' | 'ritmo';

export const INTENSITY_LABELS: Record<CardioIntensity, string> = { suave: 'Suave', moderada: 'Moderada', intensa: 'Intensa' };

export const CARDIO_TYPES = [
  'Cinta',
  'Cinta inclinada',
  'Caminar',
  'Correr',
  'Bici estática',
  'Bici exterior',
  'Elíptica',
  'Remo',
  'Escaleras',
  'Natación',
  'HIIT / circuito',
  'Otro',
] as const;

/** Tipos que se calculan con las ecuaciones ACSM (velocidad + pendiente). */
export function isPacedType(type: string): boolean {
  const t = type.toLowerCase();
  return t.startsWith('cinta') || t.includes('caminar') || t.includes('correr') || t.includes('andar') || t.includes('trotar');
}

/** Tipos en los que tiene sentido la pendiente. */
export function hasIncline(type: string): boolean {
  const t = type.toLowerCase();
  return t.startsWith('cinta') || t.includes('caminar') || t.includes('correr');
}

/** MET por tipo e intensidad (Compendium of Physical Activities, 2011/2024). */
const MET_TABLE: { match: (t: string) => boolean; met: Record<CardioIntensity, number> }[] = [
  { match: (t) => t.includes('bici') && (t.includes('estática') || t.includes('estatica') || t.includes('spinning')), met: { suave: 4.8, moderada: 6.8, intensa: 8.8 } },
  { match: (t) => t.includes('bici'), met: { suave: 4.0, moderada: 6.8, intensa: 10.0 } },
  { match: (t) => t.includes('elíptica') || t.includes('eliptica'), met: { suave: 4.0, moderada: 5.0, intensa: 7.0 } },
  { match: (t) => t.includes('remo'), met: { suave: 4.8, moderada: 7.0, intensa: 8.5 } },
  { match: (t) => t.includes('escaleras') || t.includes('step'), met: { suave: 5.0, moderada: 9.0, intensa: 11.0 } },
  { match: (t) => t.includes('natación') || t.includes('nadar') || t.includes('natacion'), met: { suave: 5.8, moderada: 8.3, intensa: 9.8 } },
  { match: (t) => t.includes('hiit') || t.includes('circuito') || t.includes('comba'), met: { suave: 4.0, moderada: 6.0, intensa: 8.0 } },
  // Caminar/correr sin velocidad: suave ≈ paseo, moderada ≈ caminar rápido o en cuesta, intensa ≈ correr suave.
  { match: (t) => t.includes('correr') || t.includes('trotar'), met: { suave: 6.0, moderada: 8.3, intensa: 9.8 } },
  { match: (t) => t.startsWith('cinta'), met: { suave: 3.5, moderada: 5.0, intensa: 8.0 } },
  { match: (t) => t.includes('caminar') || t.includes('andar'), met: { suave: 3.0, moderada: 4.3, intensa: 5.0 } },
];
const DEFAULT_MET: Record<CardioIntensity, number> = { suave: 3.5, moderada: 5.0, intensa: 7.0 };

export function metFor(type: string, intensity: CardioIntensity = 'moderada'): number {
  const t = type.toLowerCase();
  return (MET_TABLE.find((r) => r.match(t))?.met ?? DEFAULT_MET)[intensity];
}

/** Velocidad (km/h) a partir de velocidad, distancia + minutos o ritmo (min/km). */
export function speedFrom(input: { mode: PaceInput; durationMin: number; speedKmh?: number | null; distanceKm?: number | null; paceMinKm?: number | null }): number | null {
  if (input.mode === 'velocidad') return input.speedKmh && input.speedKmh > 0 ? input.speedKmh : null;
  if (input.mode === 'distancia') return input.distanceKm && input.distanceKm > 0 && input.durationMin > 0 ? input.distanceKm / (input.durationMin / 60) : null;
  return input.paceMinKm && input.paceMinKm > 0 ? 60 / input.paceMinKm : null;
}

export const WALK_MAX_KMH = 6.5;
export const RUN_MIN_KMH = 8;

export function walkingVo2(kmh: number, gradePct: number): number {
  const v = (kmh * 1000) / 60;
  return 0.1 * v + 1.8 * v * (gradePct / 100) + 3.5;
}

export function runningVo2(kmh: number, gradePct: number): number {
  const v = (kmh * 1000) / 60;
  return 0.2 * v + 0.9 * v * (gradePct / 100) + 3.5;
}

/** VO2 (ml/kg/min) según la velocidad: caminar, correr o interpolación entre ambas. */
export function acsmVo2(kmh: number, gradePct = 0): { vo2: number; gait: 'caminar' | 'correr' | 'mixto' } {
  const g = Math.max(0, gradePct);
  if (kmh <= WALK_MAX_KMH) return { vo2: walkingVo2(kmh, g), gait: 'caminar' };
  if (kmh >= RUN_MIN_KMH) return { vo2: runningVo2(kmh, g), gait: 'correr' };
  const f = (kmh - WALK_MAX_KMH) / (RUN_MIN_KMH - WALK_MAX_KMH);
  return { vo2: walkingVo2(kmh, g) * (1 - f) + runningVo2(kmh, g) * f, gait: 'mixto' };
}

export function kcalFromVo2(vo2: number, bodyKg: number, minutes: number): number {
  return (vo2 * bodyKg * minutes) / 1000 * 5;
}

export interface CardioInputData {
  type: string;
  durationMin: number;
  bodyKg: number;
  speedKmh?: number | null;
  inclinePct?: number | null;
  intensity?: CardioIntensity | null;
}

export interface CardioEstimate {
  kcal: number;
  met: number;
  method: CardioMethod;
  vo2?: number;
  gait?: 'caminar' | 'correr' | 'mixto';
  /** Texto corto con la fórmula usada. */
  detail: string;
}

export function estimateCardio(input: CardioInputData): CardioEstimate {
  const minutes = Math.max(0, input.durationMin);
  if (isPacedType(input.type) && input.speedKmh && input.speedKmh > 0) {
    const grade = hasIncline(input.type) ? (input.inclinePct ?? 0) : 0;
    const { vo2, gait } = acsmVo2(input.speedKmh, grade);
    const kcal = kcalFromVo2(vo2, input.bodyKg, minutes);
    const eq = gait === 'caminar' ? 'caminar' : gait === 'correr' ? 'correr' : 'interpolada caminar/correr';
    return {
      kcal: Math.round(kcal),
      met: Math.round((vo2 / 3.5) * 10) / 10,
      method: 'acsm',
      vo2: Math.round(vo2 * 10) / 10,
      gait,
      detail: `ACSM (${eq}): ${fmt1(input.speedKmh)} km/h, ${fmt1(grade)} % → VO2 ${fmt1(vo2)} ml/kg/min × ${fmt1(input.bodyKg)} kg × ${fmt1(minutes)} min / 1000 × 5`,
    };
  }
  const intensity = input.intensity ?? 'moderada';
  const met = metFor(input.type, intensity);
  return {
    kcal: Math.round(met * input.bodyKg * (minutes / 60)),
    met,
    method: 'met',
    detail: `MET ${fmt1(met)} (${INTENSITY_LABELS[intensity].toLowerCase()}) × ${fmt1(input.bodyKg)} kg × ${fmt1(minutes / 60)} h`,
  };
}

function fmt1(n: number) {
  return (Math.round(n * 10) / 10).toString().replace('.', ',');
}

/**
 * Tipo de cardio para un ejercicio de cardio de la biblioteca (por su id o nombre).
 * Sirve para registrar como cardio lo que se eligió en el selector de ejercicios.
 */
export function cardioTypeForExercise(idOrName: string): string {
  const t = idOrName.toLowerCase();
  if (t.includes('walking') || t.includes('caminar')) return t.includes('treadmill') || t.includes('cinta') ? 'Cinta' : 'Caminar';
  if (t.includes('treadmill') || t.includes('cinta')) return 'Cinta';
  if (t.includes('running') || t.includes('jogging') || t.includes('correr') || t.includes('trotar')) return 'Correr';
  if (t.includes('stationary') || t.includes('recumbent') || t.includes('estática')) return t.includes('rowing') || t.includes('remo') ? 'Remo' : 'Bici estática';
  if (t.includes('bicycl') || t.includes('bici')) return 'Bici exterior';
  if (t.includes('elliptical') || t.includes('elíptica')) return 'Elíptica';
  if (t.includes('rowing') || t.includes('remo')) return 'Remo';
  if (t.includes('stair') || t.includes('step') || t.includes('escaleras')) return 'Escaleras';
  if (t.includes('rope') || t.includes('comba') || t.includes('sprint') || t.includes('prowler')) return 'HIIT / circuito';
  return 'Otro';
}

export const CARDIO_EXPLANATION =
  'Estimación (±15-25 %), con tu peso más reciente.\n\n' +
  'Caminar, correr y cinta con velocidad: ecuaciones del ACSM.\n' +
  '• Caminar (hasta 6,5 km/h): VO2 = 0,1·v + 1,8·v·pendiente + 3,5\n' +
  '• Correr (desde 8 km/h): VO2 = 0,2·v + 0,9·v·pendiente + 3,5\n' +
  '• Entre 6,5 y 8 km/h se interpola entre las dos.\n' +
  'v en metros/min y pendiente en fracción (5 % = 0,05). kcal = VO2 × kg × minutos / 1000 × 5.\n\n' +
  'Bici, elíptica, remo y demás: MET según tipo e intensidad (Compendium of Physical Activities): kcal = MET × kg × horas.\n\n' +
  'Son kcal brutas. En el gasto del día solo se suma lo que va por encima de tu gasto normal en esos minutos, para no contarlo dos veces.';
