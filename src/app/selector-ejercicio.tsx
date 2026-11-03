import { router } from 'expo-router';
import { useEffect } from 'react';

import { usePicker } from '@/stores/picker';
import { ExerciseList } from '@/ui/ExerciseList';

export default function SelectorEjercicio() {
  const clear = usePicker((s) => s.clear);
  useEffect(() => clear, [clear]);
  return (
    <ExerciseList
      onSelect={(id) => {
        usePicker.getState().onPick?.(id);
        router.back();
      }}
      onCreate={() => router.push('/ejercicio/editar')}
    />
  );
}

