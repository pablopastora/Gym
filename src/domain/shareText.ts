/** Texto del entreno para compartir (entrenador, IA, notas). */
import type { RecordType, SetType } from '@/db/schema';

import { formatDateLong } from './dates';
import { fmtDuration, fmtNum } from './format';
import { RECORD_LABELS } from './records';

export interface ShareWorkout {
  name: string;
  date: string;
  startedAt: number;
  endedAt: number | null;
  kcal: number | null;
  notes: string | null;
  exercises: {
    name: string;
    notes: string | null;
    supersetGroup?: number | null;
    sets: { setType: SetType; weightKg: number | null; reps: number | null; rir: number | null; rpe: number | null; completed: boolean }[];
  }[];
  records?: { exercise: string; types: RecordType[] }[];
}

const TYPE_TAG: Partial<Record<SetType, string>> = { calentamiento: ' (calent.)', fallo: ' (al fallo)', drop: ' (drop)', backoff: ' (descarga)' };

export function workoutToText(w: ShareWorkout): string {
  const lines: string[] = [];
  const dur = w.endedAt ? fmtDuration((w.endedAt - w.startedAt) / 1000) : null;
  lines.push(`🏋️ ${w.name} — ${formatDateLong(w.date)}`);
  lines.push([dur ? `Duración ${dur}` : null, w.kcal ? `~${fmtNum(w.kcal, 0)} kcal (estimadas)` : null].filter(Boolean).join(' · '));
  lines.push('');
  let volume = 0;
  let working = 0;
  for (const e of w.exercises) {
    const done = e.sets.filter((s) => s.completed);
    if (!done.length) continue;
    lines.push(`• ${e.name}${e.supersetGroup != null ? ' [superserie]' : ''}`);
    done.forEach((s, i) => {
      const effort = s.rir != null ? ` @RIR ${fmtNum(s.rir, 1)}` : s.rpe != null ? ` @RPE ${fmtNum(s.rpe, 1)}` : '';
      const kg = s.weightKg != null && s.weightKg > 0 ? `${fmtNum(s.weightKg, 2)} kg × ` : '× ';
      lines.push(`   ${i + 1}. ${kg}${s.reps ?? '—'}${effort}${TYPE_TAG[s.setType] ?? ''}`);
      if (s.setType !== 'calentamiento') {
        volume += (s.weightKg ?? 0) * (s.reps ?? 0);
        working++;
      }
    });
    if (e.notes) lines.push(`   Nota: ${e.notes}`);
  }
  lines.push('');
  lines.push(`Total: ${working} series de trabajo · ${fmtNum(volume, 0)} kg de volumen`);
  if (w.records?.length) {
    lines.push(`🏆 Récords: ${w.records.map((r) => `${r.exercise} (${r.types.map((t) => RECORD_LABELS[t].toLowerCase()).join(', ')})`).join('; ')}`);
  }
  if (w.notes) lines.push(`Notas: ${w.notes}`);
  return lines.join('\n');
}
