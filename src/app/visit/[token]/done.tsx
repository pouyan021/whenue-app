import { Text } from 'react-native';

import { Screen, typography } from '@/components/ui';

export default function DoneScreen() {
  return (
    <Screen style={{ justifyContent: 'center' }}>
      <Text style={typography.title}>Thank you!</Text>
      <Text style={typography.body}>
        Your testimony was sent. The venue will review it before it’s shared.
      </Text>
    </Screen>
  );
}
