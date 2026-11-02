import { Banner, EmptyState, Screen } from '@/ui/components';

export default function Progreso() {
  return (
    <Screen>
      <EmptyState
        icon="chart-line"
        title="Progreso"
        text="Aquí verás peso con media móvil, perímetros, fotos con comparador, récords personales y gráficas de fuerza."
      />
      <Banner kind="info">Récords y gráficas de fuerza: fase 4. Peso, medidas y fotos: fase 5.</Banner>
    </Screen>
  );
}
