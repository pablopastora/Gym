import { evaluateGoal, onTrack, suggestedGoalDates } from '../goals';

const today = '2026-11-02';

describe('evaluación del objetivo', () => {
  it('sin objetivo', () => {
    expect(evaluateGoal({ currentKg: 95, goalKg: null, goalDate: null, today }).status).toBe('sin_objetivo');
  });
  it('ritmo recomendado: 95 → 85 en 16 semanas (0,625 kg/sem)', () => {
    const r = evaluateGoal({ currentKg: 95, goalKg: 85, goalDate: '2027-02-22', today });
    expect(r.status).toBe('recomendado');
    expect(r.requiredKgPerWeek).toBeCloseTo(0.625, 3);
  });
  it('agresivo: 10 kg en 12 semanas (0,83 kg/sem)', () => {
    expect(evaluateGoal({ currentKg: 95, goalKg: 85, goalDate: '2027-01-25', today }).status).toBe('agresivo');
  });
  it('muy agresivo: más del 1 % del peso por semana', () => {
    expect(evaluateGoal({ currentKg: 95, goalKg: 85, goalDate: '2026-12-14', today }).status).toBe('muy_agresivo');
  });
  it('lento', () => {
    expect(evaluateGoal({ currentKg: 95, goalKg: 90, goalDate: '2027-11-02', today }).status).toBe('lento');
  });
  it('fecha pasada y objetivo alcanzado', () => {
    expect(evaluateGoal({ currentKg: 95, goalKg: 85, goalDate: '2026-10-01', today }).status).toBe('fecha_pasada');
    expect(evaluateGoal({ currentKg: 85, goalKg: 85, goalDate: '2027-01-01', today }).status).toBe('alcanzado');
    expect(evaluateGoal({ currentKg: 80, goalKg: 85, goalDate: '2027-01-01', today }).status).toBe('ganancia');
  });
});

describe('fechas sugeridas', () => {
  it('10 kg → 94 días a 0,75 y 140 a 0,5', () => {
    expect(suggestedGoalDates(95, 85, today)).toEqual({ fast: '2027-02-04', slow: '2027-03-22' });
  });
});

describe('en ritmo', () => {
  it('clasifica el cambio semanal', () => {
    expect(onTrack(-0.6, 0.6)).toBe('en_ritmo');
    expect(onTrack(-0.2, 0.6)).toBe('por_detras');
    expect(onTrack(+0.3, 0.6)).toBe('por_detras');
    expect(onTrack(-1.5, 0.6)).toBe('demasiado_rapido');
    expect(onTrack(null, 0.6)).toBe('sin_datos');
  });
});
