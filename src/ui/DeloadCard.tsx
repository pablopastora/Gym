import { db } from '@/db/client';
import { formatDateShort } from '@/domain/dates';
import { useDeload } from '@/hooks/useDeload';
import { endDeload, snoozeDeload, startDeload } from '@/repositories/progress';

import { BigButton, Card, Row, Txt } from './components';
import { colors } from './theme';

/** Aviso de semana de descarga (sugerida, recomendada o en curso). */
export function DeloadCard({ compactWhenNone = true }: { compactWhenNone?: boolean }) {
  const { status, profile, today } = useDeload();
  if (!status || !profile) return null;
  if (status.state === 'no') {
    if (compactWhenNone) return null;
    return (
      <Card>
        <Txt variant="label" color={colors.textDim}>
          Descarga
        </Txt>
        <Txt color={colors.textDim}>
          {status.weeks > 0
            ? `${status.weeks} ${status.weeks === 1 ? 'semana' : 'semanas'} desde la última descarga. Se sugiere cada 6-8 semanas o si se acumula fatiga.`
            : 'Se sugerirá cada 6-8 semanas o si se acumula fatiga.'}
        </Txt>
      </Card>
    );
  }
  if (status.state === 'activa') {
    return (
      <Card style={{ borderColor: colors.border }}>
        <Txt variant="label" color={colors.accentText}>
          Semana de descarga
        </Txt>
        <Txt>{`Hasta el ${formatDateShort(profile.deloadUntil!)}: mitad de series, mismo peso y sin ir al fallo.`}</Txt>
        <BigButton title="Terminar descarga" kind="ghost" onPress={() => endDeload(db)} />
      </Card>
    );
  }
  return (
    <Card style={{ borderColor: status.state === 'recomendada' ? colors.accent : colors.warning, borderWidth: 1 }}>
      <Txt variant="label" color={status.state === 'recomendada' ? colors.accentText : colors.warning}>
        {status.state === 'recomendada' ? 'Descarga recomendada' : 'Descarga sugerida'}
      </Txt>
      <Txt>{status.reason}</Txt>
      <Txt variant="small" color={colors.textDim}>
        Una semana con la mitad de series y el mismo peso ayuda a recuperar sin perder fuerza (clave en déficit).
      </Txt>
      <Row>
        <BigButton title="Empezar" style={{ flex: 1 }} onPress={() => startDeload(db, today)} />
        <BigButton title="En 1 semana" kind="secondary" style={{ flex: 1 }} onPress={() => snoozeDeload(db, today)} />
      </Row>
    </Card>
  );
}
