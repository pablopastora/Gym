import { bmi, bmiCategory, currentTrend, movingAverage7, weeklySummary, weightForBmi } from '../body';

describe('IMC', () => {
  it('185 cm y 95 kg → 27,8 (sobrepeso)', () => {
    expect(bmi(95, 185)).toBeCloseTo(27.76, 2);
    expect(bmiCategory(bmi(95, 185))).toBe('sobrepeso');
  });
  it('categorías en los límites', () => {
    expect(bmiCategory(18.4)).toBe('bajo');
    expect(bmiCategory(18.5)).toBe('normal');
    expect(bmiCategory(25)).toBe('sobrepeso');
    expect(bmiCategory(30)).toBe('obesidad');
  });
  it('peso para un IMC dado', () => {
    expect(weightForBmi(25, 185)).toBeCloseTo(85.56, 1);
  });
});

describe('media móvil de 7 días', () => {
  it('promedia solo los registros de los últimos 7 días naturales', () => {
    const r = movingAverage7([
      { date: '2026-11-01', weightKg: 95 },
      { date: '2026-11-03', weightKg: 94 },
      { date: '2026-11-07', weightKg: 93 },
      { date: '2026-11-08', weightKg: 92 }, // 11-01 sale de la ventana
    ]);
    expect(r.map((x) => +x.trendKg.toFixed(2))).toEqual([95, 94.5, 94, 93]);
  });
  it('no depende del orden de entrada', () => {
    const a = movingAverage7([
      { date: '2026-11-02', weightKg: 94 },
      { date: '2026-11-01', weightKg: 96 },
    ]);
    expect(a[1].trendKg).toBe(95);
  });
  it('tendencia actual nula si no hay datos recientes', () => {
    expect(currentTrend([{ date: '2026-10-01', weightKg: 95 }], '2026-11-02')).toBeNull();
    expect(currentTrend([{ date: '2026-11-01', weightKg: 95 }], '2026-11-02')).toBe(95);
  });
});

describe('resumen semanal', () => {
  it('compara la semana actual (lunes-domingo) con la anterior', () => {
    // 2026-11-02 es lunes
    const s = weeklySummary(
      [
        { date: '2026-10-26', weightKg: 95 },
        { date: '2026-10-30', weightKg: 94.6 },
        { date: '2026-11-02', weightKg: 94.2 },
        { date: '2026-11-04', weightKg: 94.0 },
      ],
      '2026-11-05',
    );
    expect(s.weekStart).toBe('2026-11-02');
    expect(s.avgKg).toBeCloseTo(94.1);
    expect(s.prevAvgKg).toBeCloseTo(94.8);
    expect(s.changeKg).toBeCloseTo(-0.7);
    expect(s.entries).toBe(2);
  });
});
