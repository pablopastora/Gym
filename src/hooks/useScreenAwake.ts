import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';

const TAG = 'sesion-activa';

/** Mantiene la pantalla encendida mientras el componente está montado (tolerante a fallos). */
export function useScreenAwake() {
  useEffect(() => {
    activateKeepAwakeAsync(TAG).catch(() => {});
    return () => {
      try {
        deactivateKeepAwake(TAG)?.catch?.(() => {});
      } catch {
        // p. ej. en web si el navegador no concedió el bloqueo
      }
    };
  }, []);
}
