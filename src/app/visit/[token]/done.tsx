import { Text } from 'react-native';

import { Screen, typography } from '@/components/ui';
import { fa } from '@/i18n/fa';

export default function DoneScreen() {
  return (
    <Screen style={{ justifyContent: 'center' }}>
      <Text style={typography.title}>{fa.visit.doneTitle}</Text>
      <Text style={typography.body}>{fa.visit.doneBody}</Text>
    </Screen>
  );
}
