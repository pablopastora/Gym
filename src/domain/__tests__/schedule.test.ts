import { nextRoutineDay } from '../schedule';

const days = [
  { id: 1, sortOrder: 0, isOptional: false },
  { id: 2, sortOrder: 1, isOptional: false },
  { id: 3, sortOrder: 2, isOptional: false },
  { id: 4, sortOrder: 3, isOptional: false },
  { id: 5, sortOrder: 4, isOptional: true },
];

describe('siguiente día de rutina', () => {
  it('empieza por el día 1', () => expect(nextRoutineDay(days, null, 4)?.id).toBe(1));
  it('avanza en orden', () => expect(nextRoutineDay(days, 2, 4)?.id).toBe(3));
  it('con 4 días salta el opcional y vuelve al 1', () => expect(nextRoutineDay(days, 4, 4)?.id).toBe(1));
  it('con 5 días incluye el opcional', () => expect(nextRoutineDay(days, 4, 5)?.id).toBe(5));
  it('tras el opcional vuelve al 1', () => expect(nextRoutineDay(days, 5, 5)?.id).toBe(1));
  it('día desconocido → primero', () => expect(nextRoutineDay(days, 99, 4)?.id).toBe(1));
  it('sin días → null', () => expect(nextRoutineDay([], null, 4)).toBeNull());
});
