import {
  defaultComparison,
  groupPhotosByDate,
  measurementAt,
  measurementSummary,
  prefillWeight,
  trendAt,
  weightChartData,
} from '../body';

const W = [
  { date: '2026-10-01', weightKg: 95 },
  { date: '2026-10-02', weightKg: 94.6 },
  { date: '2026-10-05', weightKg: 94.4 },
  { date: '2026-10-20', weightKg: 93.2 },
];

describe('registro rápido de peso', () => {
  it('rellena con el último peso si hoy no hay registro', () => {
    expect(prefillWeight(W, '2026-10-21')).toEqual({ value: 93.2, isToday: false });
  });
  it('si hoy ya hay registro, muestra el de hoy', () => {
    expect(prefillWeight(W, '2026-10-20')).toEqual({ value: 93.2, isToday: true });
  });
  it('sin registros, vacío', () => {
    expect(prefillWeight([], '2026-10-21')).toEqual({ value: null, isToday: false });
  });
});

describe('gráfica de peso', () => {
  it('filtra por rango y calcula la tendencia con datos anteriores', () => {
    const d = weightChartData(W, '2026-10-02');
    expect(d.start).toBe('2026-10-02');
    expect(d.raw.map((p) => p.x)).toEqual([0, 3, 18]);
    // la tendencia del 2 oct incluye el 1 oct (95 y 94,6)
    expect(d.trend[0].y).toBeCloseTo(94.8);
  });
  it('tendencia en una fecha', () => {
    expect(trendAt(W, '2026-10-05')).toBeCloseTo((95 + 94.6 + 94.4) / 3);
    // sin registros en 7 días → último conocido
    expect(trendAt(W, '2026-10-19')).toBe(94.4);
    expect(trendAt(W, '2026-09-01')).toBeNull();
  });
});

describe('medidas', () => {
  const M = [
    { date: '2026-10-01', waistCm: 104, chestCm: 110 },
    { date: '2026-10-15', waistCm: 101.5 },
    { date: '2026-10-29', waistCm: 100, bodyFatPct: 24 },
  ];
  it('resumen con último valor y cambio', () => {
    const s = measurementSummary(M);
    expect(s.waistCm).toMatchObject({ last: 100, first: 104, change: -4 });
    expect(s.chestCm).toMatchObject({ last: 110, change: 0 });
    expect(s.armCm).toBeNull();
    expect(s.bodyFatPct?.lastDate).toBe('2026-10-29');
  });
  it('valor en una fecha', () => {
    expect(measurementAt(M, 'waistCm', '2026-10-20')).toBe(101.5);
    expect(measurementAt(M, 'waistCm', '2026-09-01')).toBeNull();
  });
});

describe('fotos', () => {
  const P = [
    { id: 1, date: '2026-10-01', view: 'frontal' as const, fileName: 'a' },
    { id: 2, date: '2026-10-01', view: 'lateral' as const, fileName: 'b' },
    { id: 3, date: '2026-10-15', view: 'frontal' as const, fileName: 'c' },
    { id: 4, date: '2026-11-01', view: 'frontal' as const, fileName: 'd' },
    { id: 5, date: '2026-11-01', view: 'frontal' as const, fileName: 'e' },
  ];
  it('agrupa por fecha, reciente primero; la última de la misma vista gana', () => {
    const g = groupPhotosByDate(P);
    expect(g.map((d) => d.date)).toEqual(['2026-11-01', '2026-10-15', '2026-10-01']);
    expect(g[0].views.frontal?.fileName).toBe('e');
    expect(g[2].views.lateral?.fileName).toBe('b');
  });
  it('comparación por defecto: más antigua y más reciente con esa vista', () => {
    const g = groupPhotosByDate(P);
    expect(defaultComparison(g, 'frontal')).toEqual(['2026-10-01', '2026-11-01']);
    // solo hay una lateral → cae a todas las fechas
    expect(defaultComparison(g, 'lateral')).toEqual(['2026-10-01', '2026-11-01']);
    expect(defaultComparison([], 'frontal')).toEqual([null, null]);
  });
});
