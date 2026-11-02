import { router } from 'expo-router';

import { useTodaySession } from '@/hooks/useTodaySession';
import { Banner, Card, EmptyState, Row, SectionTitle, Screen, Txt } from '@/ui/components';
import { colors } from '@/ui/theme';

export default function Entrenar() {
  const { routine, today, profile } = useTodaySession();
  if (!routine) {
    return (
      <Screen>
        <EmptyState icon="dumbbell" title="Sin rutina activa" text="Activa una rutina en la pestaña Rutinas." />
      </Screen>
    );
  }
  const days = routine.days.filter((d) => (profile?.daysPerWeek ?? 4) >= 5 || !d.isOptional);
  return (
    <Screen>
      <Banner kind="info">
        Fase 2: aquí elegirás el día y empezará la sesión activa (registro de series, temporizador de descanso y
        cronómetro), que llega en la fase 3.
      </Banner>
      <SectionTitle>{routine.name}</SectionTitle>
      {days.map((d) => (
        <Card key={d.id} onPress={() => router.push({ pathname: '/rutina/[id]', params: { id: routine.id } })}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3" style={{ flex: 1 }}>
              {d.name}
            </Txt>
            {today?.id === d.id ? (
              <Txt variant="caption" color={colors.primary}>
                TOCA HOY
              </Txt>
            ) : null}
          </Row>
          <Txt variant="small" color={colors.textDim}>
            {d.exercises.length} ejercicios
          </Txt>
        </Card>
      ))}
    </Screen>
  );
}
