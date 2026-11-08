import { View } from 'react-native';

import { fmtNum } from '@/domain/format';

import { Row, Txt } from '../components';
import { colors, radius } from '../theme';

/**
 * Barra de progreso de un macro frente a su objetivo. Tono neutro: pasarse o
 * quedarse corto no se pinta de rojo ni se juzga.
 */
export function MacroBar({ label, value, target, unit = 'g', color = colors.textDim }: { label: string; value: number; target: number | null; unit?: string; color?: string }) {
  const ratio = target && target > 0 ? Math.min(1, value / target) : 0;
  return (
    <View style={{ gap: 4 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="smallBold">{label}</Txt>
        <Txt variant="small" color={colors.textDim}>
          {target ? `${fmtNum(value, 0)} / ${fmtNum(target, 0)} ${unit}` : `${fmtNum(value, 0)} ${unit}`}
        </Txt>
      </Row>
      <View style={{ height: 8, borderRadius: radius.pill, backgroundColor: colors.surface2, overflow: 'hidden' }}>
        <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: color, borderRadius: radius.pill }} />
      </View>
    </View>
  );
}
