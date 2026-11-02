import { router } from 'expo-router';

import { ExerciseList } from '@/ui/ExerciseList';

export default function Ejercicios() {
  return <ExerciseList onSelect={(id) => router.push({ pathname: '/ejercicio/[id]', params: { id } })} />;
}
