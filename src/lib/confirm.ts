import { Alert, Platform } from 'react-native';

/** Asks a yes/no question; on web the native Alert is unavailable, so the browser's confirm is used. */
export function confirm(title: string, message: string, ok: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: ok, style: 'destructive', onPress: onOk },
  ]);
}
