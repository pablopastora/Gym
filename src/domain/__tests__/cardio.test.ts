import { acsmVo2, cardioTypeForExercise, estimateCardio, metFor, runningVo2, speedFrom, walkingVo2 } from '../cardio';

describe('ecuaciones ACSM', () => {
  it('caminar 30 min a 5,5 km/h con 5 % de pendiente, 95 kg ≈ 298 kcal', () => {
    // v = 91,67 m/min; VO2 = 9,17 + 8,25 + 3,5 = 20,92 ml/kg/min
    expect(walkingVo2(5.5, 5)).toBeCloseTo(20.917, 2);
    const e = estimateCardio({ type: 'Cinta inclinada', durationMin: 30, bodyKg: 95, speedKmh: 5.5, inclinePct: 5 });
    expect(e.method).toBe('acsm');
    expect(e.gait).toBe('caminar');
    expect(e.kcal).toBe(298);
    expect(e.met).toBeCloseTo(6, 0);
  });
  it('caminar en llano: 5 km/h, 0 %, 80 kg, 60 min ≈ 290 kcal', () => {
    // v = 83,33; VO2 = 8,33 + 3,5 = 11,83 → 11,83 × 80 × 60 / 1000 × 5 = 284
    expect(estimateCardio({ type: 'Caminar', durationMin: 60, bodyKg: 80, speedKmh: 5, inclinePct: 0 }).kcal).toBe(284);
  });
  it('correr 10 km/h, 1 %, 70 kg, 30 min', () => {
    // v = 166,67; VO2 = 33,33 + 1,5 + 3,5 = 38,33 → 38,33 × 70 × 30 / 1000 × 5 = 402,5
    expect(runningVo2(10, 1)).toBeCloseTo(38.333, 2);
    const e = estimateCardio({ type: 'Correr', durationMin: 30, bodyKg: 70, speedKmh: 10, inclinePct: 1 });
    expect(e.gait).toBe('correr');
    expect(e.kcal).toBe(403);
  });
  it('entre 6,5 y 8 km/h interpola entre caminar y correr', () => {
    const w = walkingVo2(6.5, 0);
    const r = runningVo2(8, 0);
    const mid = acsmVo2(7.25, 0);
    expect(mid.gait).toBe('mixto');
    expect(mid.vo2).toBeGreaterThan(walkingVo2(7.25, 0));
    expect(mid.vo2).toBeLessThan(runningVo2(7.25, 0));
    expect(acsmVo2(6.5, 0).vo2).toBeCloseTo(w);
    expect(acsmVo2(8, 0).vo2).toBeCloseTo(r);
  });
  it('la pendiente sube el gasto y no admite valores negativos', () => {
    expect(acsmVo2(5, 10).vo2).toBeGreaterThan(acsmVo2(5, 0).vo2);
    expect(acsmVo2(5, -3).vo2).toBeCloseTo(acsmVo2(5, 0).vo2);
  });
  it('la pendiente se ignora fuera de cinta/caminar/correr', () => {
    expect(estimateCardio({ type: 'Bici estática', durationMin: 30, bodyKg: 90, inclinePct: 10 }).method).toBe('met');
  });
});

describe('velocidad', () => {
  it('desde distancia y minutos, o desde el ritmo', () => {
    expect(speedFrom({ mode: 'distancia', durationMin: 30, distanceKm: 3 })).toBeCloseTo(6);
    expect(speedFrom({ mode: 'ritmo', durationMin: 30, paceMinKm: 6 })).toBeCloseTo(10);
    expect(speedFrom({ mode: 'velocidad', durationMin: 30, speedKmh: 5.5 })).toBe(5.5);
    expect(speedFrom({ mode: 'distancia', durationMin: 0, distanceKm: 3 })).toBeNull();
    expect(speedFrom({ mode: 'velocidad', durationMin: 30, speedKmh: null })).toBeNull();
  });
});

describe('MET por tipo e intensidad', () => {
  it('valores por tipo', () => {
    expect(metFor('Bici estática', 'moderada')).toBe(6.8);
    expect(metFor('Elíptica', 'moderada')).toBe(5);
    expect(metFor('Remo', 'intensa')).toBe(8.5);
    expect(metFor('Natación', 'suave')).toBe(5.8);
    expect(metFor('Otro')).toBe(5);
  });
  it('kcal = MET × kg × horas', () => {
    const e = estimateCardio({ type: 'Elíptica', durationMin: 30, bodyKg: 95, intensity: 'moderada' });
    expect(e).toMatchObject({ method: 'met', met: 5, kcal: 238 });
  });
  it('cinta sin velocidad: intensidad (no se asume correr)', () => {
    expect(estimateCardio({ type: 'Cinta', durationMin: 30, bodyKg: 95 }).met).toBe(5);
  });
});

describe('ejercicios de cardio de la biblioteca', () => {
  it('se traducen a un tipo de cardio', () => {
    expect(cardioTypeForExercise('Walking_Treadmill')).toBe('Cinta');
    expect(cardioTypeForExercise('Running_Treadmill')).toBe('Cinta');
    expect(cardioTypeForExercise('Bicycling_Stationary')).toBe('Bici estática');
    expect(cardioTypeForExercise('Rowing_Stationary')).toBe('Remo');
    expect(cardioTypeForExercise('Elliptical_Trainer')).toBe('Elíptica');
    expect(cardioTypeForExercise('Stairmaster')).toBe('Escaleras');
  });
});
