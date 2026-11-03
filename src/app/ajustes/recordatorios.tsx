import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Platform, Switch, View } from 'react-native';

import { db } from '@/db/client';
import { WEEKDAYS_LONG } from '@/domain/calendar';
import { remindersQuery, setReminder } from '@/repositories/reminders';
import { ensureNotificationPermission } from '@/services/notifications';
import { syncReminders } from '@/services/reminders';
import { showAlert } from '@/ui/alert';
import { Banner, ListRow, Screen, Txt } from '@/ui/components';
import { colors, radius } from '@/ui/theme';

const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

export default function Recordatorios() {
  const { data } = useLiveQuery(remindersQuery(db));
  if (!data) return null;
  const byDay = new Map(data.map((r) => [r.weekday, r]));

  const update = async (weekday: number, patch: { hour?: number; minute?: number; enabled?: boolean }) => {
    if (patch.enabled !== false && !(await ensureNotificationPermission())) {
      showAlert('Sin permiso', 'Activa las notificaciones de la app en los ajustes de Android para recibir recordatorios.');
      return;
    }
    await setReminder(db, weekday, patch);
    await syncReminders();
  };

  const pickTime = (weekday: number, hour: number, minute: number) => {
    if (Platform.OS !== 'android') return;
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    DateTimePickerAndroid.open({
      value: d,
      mode: 'time',
      is24Hour: true,
      onValueChange: (_e, t) => update(weekday, { hour: t.getHours(), minute: t.getMinutes(), enabled: true }),
    });
  };

  return (
    <Screen>
      <Txt color={colors.textDim}>Activa los días que entrenas y la hora del aviso. Toca la hora para cambiarla.</Txt>
      <View style={{ borderRadius: radius.lg, overflow: 'hidden', gap: 1 }}>
        {WEEKDAYS_LONG.map((name, i) => {
          const weekday = i + 1;
          const r = byDay.get(weekday);
          const hour = r?.hour ?? 18;
          const minute = r?.minute ?? 0;
          const on = !!r?.enabled;
          return (
            <ListRow
              key={weekday}
              icon={on ? 'bell-ring-outline' : 'bell-off-outline'}
              title={name}
              subtitle={on ? `Aviso a las ${hhmm(hour, minute)} · tocar para cambiar` : 'Sin aviso'}
              onPress={() => pickTime(weekday, hour, minute)}
              right={
                <Switch
                  value={on}
                  onValueChange={(v) => update(weekday, { enabled: v, hour, minute })}
                  trackColor={{ true: colors.accent, false: colors.border }}
                  thumbColor={colors.text}
                />
              }
            />
          );
        })}
      </View>
      <Banner kind="info">Los avisos se repiten cada semana aunque no abras la app.</Banner>
    </Screen>
  );
}
