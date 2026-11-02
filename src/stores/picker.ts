import { router } from 'expo-router';
import { create } from 'zustand';

/** Puente para el selector de ejercicios: quien lo abre deja aquí qué hacer con el elegido. */
interface PickerStore {
  onPick: ((exerciseId: string) => void) | null;
  open: (onPick: (exerciseId: string) => void) => void;
  clear: () => void;
}

export const usePicker = create<PickerStore>((set) => ({
  onPick: null,
  open: (onPick) => set({ onPick }),
  clear: () => set({ onPick: null }),
}));

/** Abre el selector de ejercicios y ejecuta `onPick` con el elegido. */
export function pickExercise(onPick: (exerciseId: string) => void) {
  usePicker.getState().open(onPick);
  router.push('/selector-ejercicio');
}
