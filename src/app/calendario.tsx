import { Banner, EmptyState, Screen } from '@/ui/components';

export default function Calendario() {
  return (
    <Screen>
      <EmptyState
        icon="calendar-month-outline"
        title="Calendario"
        text="Verás los días entrenados, el cardio y la racha, y podrás configurar recordatorios."
      />
      <Banner kind="info">Disponible en la fase 7.</Banner>
    </Screen>
  );
}
