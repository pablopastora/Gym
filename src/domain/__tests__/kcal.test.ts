import { cardioMet, effectiveMinutes, estimateCardioKcal, estimateStrengthKcal, type KcalSet } from '../kcal';

const sets = (n: number, extra: Partial<KcalSet> = {}): KcalSet[] =>
  Array.from({ length: n }, () => ({ setType: 'normal', completed: true, weightKg: 60, reps: 10, ...extra }));

describe('kcal de fuerza', () => {
  it('sesión típica moderada: 16 series en 60 min a 95 kg ≈ 475 kcal', () => {
    const r = estimateStrengthKcal({ sets: sets(16, { rir: 2 }), totalMin: 60, bodyKg: 95 });
    expect(r.level).toBe('moderado');
    expect(r.met).toBe(5);
    expect(r.kcal).toBe(475);
  });
  it('intensa: cerca del fallo, descansos cortos y mucho volumen', () => {
    const r = estimateStrengthKcal({ sets: sets(22, { rir: 0 }), totalMin: 55, bodyKg: 95 });
    expect(r.level).toBe('intenso');
    expect(r.met).toBe(6);
  });
  it('ligera: poco volumen y descansos largos', () => {
    const r = estimateStrengthKcal({ sets: sets(6), totalMin: 45, bodyKg: 95 });
    expect(r.level).toBe('ligero');
    expect(r.met).toBe(3.5);
  });
  it('RPE se usa si no hay RIR', () => {
    const r = estimateStrengthKcal({ sets: sets(16, { rpe: 9.5 }), totalMin: 60, bodyKg: 95 });
    expect(r.factors).toContain('esfuerzo alto (RPE ≥ 9)');
  });
  it('series sin completar o calentamientos no cuentan como trabajo', () => {
    const r = estimateStrengthKcal({
      sets: [...sets(4, { setType: 'calentamiento' }), ...sets(3, { completed: false }), ...sets(10)],
      totalMin: 50,
      bodyKg: 90,
    });
    expect(r.workingSets).toBe(10);
  });
  it('duración efectiva: si se olvida terminar, se limita', () => {
    expect(effectiveMinutes(240, 20)).toBe(80);
    expect(effectiveMinutes(60, 20)).toBe(60);
    expect(effectiveMinutes(10, 0)).toBe(0);
    expect(estimateStrengthKcal({ sets: [], totalMin: 30, bodyKg: 90 }).kcal).toBe(0);
  });
});

describe('kcal de cardio', () => {
  it('MET por tipo y ritmo', () => {
    expect(cardioMet('Cinta inclinada', 30)).toBe(6);
    expect(cardioMet('Caminar', 60, 5)).toBe(3.5);
    expect(cardioMet('Correr', 30, 5)).toBe(9.8); // 10 km/h
    expect(cardioMet('Correr', 30)).toBe(8.3);
    expect(cardioMet('Bici estática', 30)).toBe(6.8);
    expect(cardioMet('Elíptica', 30)).toBe(5);
    expect(cardioMet('Otro', 30)).toBe(5);
  });
  it('30 min de cinta inclinada a 95 kg = 285 kcal', () => {
    expect(estimateCardioKcal({ type: 'Cinta inclinada', durationMin: 30, bodyKg: 95 })).toEqual({ met: 6, kcal: 285 });
  });
});
