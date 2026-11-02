import { addDays, diffDays, formatDateLong, isValidISODate, startOfWeek } from '../dates';
import { classifyKind, classifyRegion, DEFAULT_REST, incrementFor, resolveRest } from '../exerciseClassify';
import { fmtDuration, fmtNum, parseDecimal } from '../format';
import { epley1RM, estimated1RM, setVolume } from '../oneRm';
import { matchesQuery } from '../search';

describe('fechas', () => {
  it('suma y diferencia de días cruzando cambio de hora y año', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
  });
  it('lunes de la semana', () => {
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02'); // domingo
    expect(startOfWeek('2026-11-02')).toBe('2026-11-02');
  });
  it('validación y formato', () => {
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-02-28')).toBe(true);
    expect(formatDateLong('2026-11-02')).toBe('lunes 2 nov');
  });
});

describe('formato', () => {
  it('números en español', () => {
    expect(fmtNum(82.5)).toBe('82,5');
    expect(parseDecimal('82,5')).toBe(82.5);
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('')).toBeNull();
  });
  it('duraciones', () => {
    expect(fmtDuration(75)).toBe('1:15');
    expect(fmtDuration(3725)).toBe('1:02:05');
  });
});

describe('1RM', () => {
  it('Epley', () => {
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(100, 10)).toBeCloseTo(133.33, 1);
  });
  it('no estima con más de 12 reps', () => {
    expect(estimated1RM(60, 15)).toBeNull();
    expect(estimated1RM(80, 8)).toBeCloseTo(101.33, 1);
  });
  it('volumen', () => {
    expect(setVolume(80, 10)).toBe(800);
    expect(setVolume(null, 10)).toBe(0);
  });
});

describe('clasificación y descansos', () => {
  it('región', () => {
    expect(classifyRegion(['quadriceps'])).toBe('inferior');
    expect(classifyRegion(['chest'])).toBe('superior');
    expect(classifyRegion(['abdominals'])).toBe('core');
    expect(classifyRegion([])).toBe('cuerpo_completo');
  });
  it('tipo', () => {
    expect(classifyKind({ primaryMuscles: ['chest'], mechanic: 'compound', category: 'strength' })).toBe('compuesto');
    expect(classifyKind({ primaryMuscles: ['biceps'], mechanic: 'isolation', category: 'strength' })).toBe('accesorio');
    expect(classifyKind({ primaryMuscles: ['abdominals'], mechanic: 'isolation', category: 'strength' })).toBe('abs');
  });
  it('prioridad del descanso: rutina > ejercicio > tipo', () => {
    expect(resolveRest('compuesto', DEFAULT_REST)).toBe(150);
    expect(resolveRest('accesorio', DEFAULT_REST)).toBe(75);
    expect(resolveRest('abs', DEFAULT_REST)).toBe(50);
    expect(resolveRest('compuesto', DEFAULT_REST, 180)).toBe(180);
    expect(resolveRest('compuesto', DEFAULT_REST, 180, 120)).toBe(120);
  });
  it('incremento por región', () => {
    expect(incrementFor('inferior', { upper: 2.5, lower: 5 })).toBe(5);
    expect(incrementFor('superior', { upper: 2.5, lower: 5 })).toBe(2.5);
  });
});

describe('búsqueda', () => {
  it('ignora tildes y mayúsculas y busca todas las palabras', () => {
    expect(matchesQuery('extension triceps', 'Extensión de tríceps en polea')).toBe(true);
    expect(matchesQuery('bench', 'Press de banca', 'Barbell Bench Press')).toBe(true);
    expect(matchesQuery('remo pierna', 'Remo con barra')).toBe(false);
    expect(matchesQuery('  ', 'x')).toBe(true);
  });
});
