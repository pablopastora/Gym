import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * Alert.alert nativo en Android. En la vista previa web (donde Alert no hace nada)
 * usa window.confirm/alert para poder probar los flujos de confirmación.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');
  const text = message ? `${title}\n\n${message}` : title;
  if (!actions.length) {
    window.alert(text);
    return;
  }
  // En web solo se ofrece la última acción (la principal) frente a cancelar.
  if (window.confirm(text)) actions[actions.length - 1].onPress?.();
}
