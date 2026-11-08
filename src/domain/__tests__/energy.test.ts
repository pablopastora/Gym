import { addDays } from '../dates';
import {
  adaptiveSuggestion,
  bmrMifflin,
  calorieTarget,
  dailyExpenditure,
  defaultRate,
  deficitForRate,
  lowIntakeStreak,
  macroTargets,
  missingForBmr,
  netExerciseKcal,
  type AdaptiveDay,
} from '../energy';

describe('BMR (Mifflin-St Jeor)', () => {
  it('hombre 95 kg, 185 cm, 30 años ≈ 1.961 kcal', () => {
    // 950 + 1156,25 − 150 + 5
    expect(bmrMifflin({ sex: 'hombre', weightKg: 95, heightCm: 185, age: 30 })).toBeCloseTo(1961.25);
  });
  it('mujer: −161 en lugar de +5', () => {
    expect(bmrMifflin({ sex: 'mujer', weightKg: 60, heightCm: 165, age: 30 })).toBeCloseTo(600 + 1031.25 - 150 - 161);
  });
  it('si faltan edad o sexo no se calcula (no se inventan)', () => {
    expect(missingForBmr({ age: null, sex: null })).toEqual(['edad', 'sexo']);
    expect(missingForBmr({ age: 30, sex: null })).toEqual(['sexo']);
    expect(missingForBmr({ age: 30, sex: 'hombre' })).toEqual([]);
  });
});

describe('gasto diario', () => {
  const bmr = 2000;
  it('basal × factor sin ejercicio', () => {
    const d = dailyExpenditure({ bmr, factor: 1.3, weightKg: 95, items: [] });
    expect(d.total).toBeCloseTo(2600);
    expect(d.neat).toBeCloseTo(600);
    expect(d.exerciseNet).toBe(0);
  });
  it('el ejercicio se suma en neto (sin contar dos veces el tiempo que ya cubre el factor)', () => {
    // 30 min de cinta (298 kcal brutas, MET ~6): base por minuto 2600/1440 = 1,806 → resta ~54 kcal.
    const items = [{ kcal: 298, met: 6 }];
    const net = netExerciseKcal(items, 2600 / 1440, 95);
    const minutes = (298 * 60) / (6 * 95);
    expect(net).toBeCloseTo(298 - minutes * (2600 / 1440));
    const d = dailyExpenditure({ bmr, factor: 1.3, weightKg: 95, items });
    expect(d.exerciseGross).toBe(298);
    expect(d.total).toBeCloseTo(2600 + net);
    expect(d.total).toBeLessThan(2600 + 298);
  });
  it('la recalibración aceptada se suma', () => {
    expect(dailyExpenditure({ bmr, factor: 1.2, weightKg: 90, items: [], adjust: -150 }).total).toBeCloseTo(2250);
  });
});

describe('objetivo calórico y suelo de seguridad', () => {
  it('déficit por ritmo: 0,5 kg/sem ≈ 550 kcal, 0,75 ≈ 825', () => {
    expect(deficitForRate(0.5)).toBe(550);
    expect(deficitForRate(0.75)).toBe(825);
  });
  it('ritmo por defecto entre 0,5 y 0,75 según el objetivo', () => {
    expect(defaultRate(null)).toBe(0.5);
    expect(defaultRate(0.3)).toBe(0.5);
    expect(defaultRate(0.6)).toBe(0.6);
    expect(defaultRate(1.2)).toBe(0.75);
  });
  it('objetivo = gasto − déficit', () => {
    const t = calorieTarget({ expectedTdee: 2900, bmr: 1950, rateKgWeek: 0.5 });
    expect(t.targetKcal).toBe(2350);
    expect(t.deficitKcal).toBe(550);
    expect(t.raisedToFloor).toBe(false);
  });
  it('el déficit no pasa del 25 % del gasto', () => {
    const t = calorieTarget({ expectedTdee: 2400, bmr: 1500, rateKgWeek: 1 });
    expect(t.cappedDeficit).toBe(true);
    expect(t.targetKcal).toBe(1800);
  });
  it('nunca por debajo del basal', () => {
    const t = calorieTarget({ expectedTdee: 2400, bmr: 1900, rateKgWeek: 0.75 });
    expect(t.targetKcal).toBe(1900);
    expect(t.raisedToFloor).toBe(true);
  });
  it('nunca por debajo de 1.500 kcal', () => {
    const t = calorieTarget({ expectedTdee: 1800, bmr: 1300, rateKgWeek: 0.5 });
    expect(t.floorKcal).toBe(1500);
    expect(t.targetKcal).toBe(1500);
  });
  it('objetivo manual por debajo del suelo: se avisa y se propone uno más suave', () => {
    const t = calorieTarget({ expectedTdee: 2900, bmr: 1950, rateKgWeek: 0.5, manualKcal: 1400 });
    expect(t.isManual).toBe(true);
    expect(t.manualBelowFloor).toBe(true);
    expect(t.suggestedKcal).toBe(2350);
    expect(calorieTarget({ expectedTdee: 2900, bmr: 1950, rateKgWeek: 0.5, manualKcal: 2200 }).manualBelowFloor).toBe(false);
  });
});

describe('macros', () => {
  it('proteína y grasa por kg; el resto hidratos', () => {
    const m = macroTargets({ kcal: 2300, weightKg: 95, proteinGPerKg: 2, fatGPerKg: 0.7 });
    expect(m).toEqual({ proteinG: 190, fatG: 67, carbsG: Math.round((2300 - 760 - 603) / 4), tight: false });
  });
  it('si no caben, hidratos 0 y aviso', () => {
    expect(macroTargets({ kcal: 1000, weightKg: 100, proteinGPerKg: 2.2, fatGPerKg: 1 }).tight).toBe(true);
  });
});

describe('ajuste adaptativo', () => {
  const today = '2026-11-30';
  const mk = (intake: number | null, est: number, n = 30): AdaptiveDay[] =>
    Array.from({ length: n }, (_, i) => ({ date: addDays(today, -n + i), intakeKcal: intake, estimatedKcal: est }));
  const weightsLinear = (start: number, perDay: number, n = 30) => Array.from({ length: n }, (_, i) => ({ date: addDays(today, -n + i), weightKg: start + perDay * i }));

  it('si el peso baja menos de lo esperado, propone bajar el gasto estimado', () => {
    // Come 2200 frente a 2800 estimadas (−600/día ≈ −0,55 kg/sem), pero baja 0,2 kg/sem.
    const s = adaptiveSuggestion({ today, days: mk(2200, 2800), weights: weightsLinear(95, -0.2 / 7) });
    expect(s).not.toBeNull();
    // gasto observado = 2200 + 0,2/7 × 7700 ≈ 2420 → −380, limitado a −300
    expect(s!.observedTdee).toBeGreaterThan(2400);
    expect(s!.observedTdee).toBeLessThan(2440);
    expect(s!.deltaKcal).toBe(-300);
  });
  it('si cuadra (±100 kcal), no propone nada', () => {
    expect(adaptiveSuggestion({ today, days: mk(2200, 2800), weights: weightsLinear(95, (-600 / 7700)) })).toBeNull();
  });
  it('sin 14 días registrados o sin pesajes suficientes, no propone nada', () => {
    const days = mk(2200, 2800).map((d, i) => (i % 3 === 0 ? d : { ...d, intakeKcal: null }));
    expect(adaptiveSuggestion({ today, days, weights: weightsLinear(95, -0.01) })).toBeNull();
    expect(adaptiveSuggestion({ today, days: mk(2200, 2800), weights: [{ date: addDays(today, -2), weightKg: 95 }] })).toBeNull();
  });
});

describe('ingestas muy bajas', () => {
  const today = '2026-11-10';
  const map = (vals: [number, number][]) => new Map(vals.map(([d, k]) => [addDays(today, -d), k]));
  it('cuenta días seguidos por debajo del umbral hasta ayer', () => {
    expect(lowIntakeStreak({ today, intakeByDate: map([[1, 900], [2, 1000], [3, 800], [4, 2200]]), floorKcal: 1900 })).toBe(3);
  });
  it('un día sin registro corta la racha', () => {
    expect(lowIntakeStreak({ today, intakeByDate: map([[1, 900], [3, 800]]), floorKcal: 1900 })).toBe(1);
  });
  it('umbral = máx(1.200, 75 % del suelo)', () => {
    // suelo 1500 → umbral 1200: 1300 no es «muy baja»
    expect(lowIntakeStreak({ today, intakeByDate: map([[1, 1300]]), floorKcal: 1500 })).toBe(0);
    // suelo 2000 → umbral 1500: 1300 sí
    expect(lowIntakeStreak({ today, intakeByDate: map([[1, 1300]]), floorKcal: 2000 })).toBe(1);
  });
});
