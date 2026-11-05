/**
 * Superseries: ejercicios del mismo grupo se alternan serie a serie y el
 * descanso solo llega al terminar la ronda (tras el último ejercicio del grupo).
 */
export interface SsSet {
  id: number;
  setType: string;
  completed: boolean;
}

export interface SsExercise {
  id: number;
  name: string;
  supersetGroup: number | null;
  restS: number | null;
  sets: SsSet[];
}

export type RestDecision = { kind: 'descanso'; restS: number | null } | { kind: 'siguiente'; exerciseId: number; label: string };

/**
 * Qué hacer tras completar `setId` (que ya se considera completada):
 *  - en una superserie, pasar al siguiente ejercicio del grupo con series pendientes (sin descanso);
 *  - si no, descanso (el mayor del grupo).
 */
export function afterSetInSuperset(exercises: SsExercise[], weId: number, setId: number): RestDecision {
  const we = exercises.find((e) => e.id === weId);
  if (!we || we.supersetGroup == null) return { kind: 'descanso', restS: we?.restS ?? null };
  const group = exercises.filter((e) => e.supersetGroup === we.supersetGroup);
  if (group.length < 2) return { kind: 'descanso', restS: we.restS };
  const pending = (e: SsExercise) => e.sets.some((s) => !s.completed && s.id !== setId && s.setType !== 'calentamiento');
  const idx = group.findIndex((e) => e.id === weId);
  // Siguiente en el orden del grupo (con vuelta) que tenga series pendientes.
  for (let k = 1; k < group.length; k++) {
    const next = group[(idx + k) % group.length];
    if (idx + k >= group.length) break; // la ronda termina en el último del grupo
    if (pending(next)) return { kind: 'siguiente', exerciseId: next.id, label: next.name };
  }
  const restS = Math.max(...group.map((e) => e.restS ?? 0)) || we.restS;
  return { kind: 'descanso', restS };
}

/** Agrupa: asigna un id de grupo común (el menor id) a dos ejercicios consecutivos. */
export function linkGroup(aId: number, bId: number, aGroup: number | null, bGroup: number | null): number {
  return aGroup ?? bGroup ?? Math.min(aId, bId);
}
