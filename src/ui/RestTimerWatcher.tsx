import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { AppState, Vibration } from 'react-native';

import { useRestTimer } from '@/stores/restTimer';

/**
 * Componente sin interfaz montado en el layout raíz: cuando el descanso termina
 * con la app abierta, vibra y lo limpia. (En segundo plano avisa la notificación.)
 */
export function RestTimerWatcher() {
  const rest = useRestTimer((s) => s.rest);
  const finish = useRestTimer((s) => s.finish);

  useEffect(() => {
    if (!rest) return;
    const fire = () => {
      if (AppState.currentState === 'active') {
        Vibration.vibrate([0, 400, 200, 400, 200, 400]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      finish();
    };
    const ms = rest.endAt - Date.now();
    if (ms <= 0) {
      fire();
      return;
    }
    const t = setTimeout(fire, ms);
    // Al volver del segundo plano, comprobar si ya terminó (los timers JS pueden pausarse).
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && Date.now() >= rest.endAt) finish();
    });
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, [rest, finish]);

  return null;
}
