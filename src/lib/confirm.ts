import { Alert, Platform } from 'react-native';

import { fa } from '@/i18n/fa';

/** Asks the person to confirm a step, with Yes and Cancel. */
export function confirm(message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(message) ?? false);
  return new Promise((resolve) =>
    Alert.alert('', message, [
      { text: fa.common.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: fa.settings.yes, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
}
