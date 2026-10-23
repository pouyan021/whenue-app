import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

export const colors = {
  primary: '#2563EB',
  danger: '#DC2626',
  text: '#111827',
  muted: '#6B7280',
  border: '#D1D5DB',
  background: '#FFFFFF',
};

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};

export function Button({ title, onPress, disabled, loading, variant = 'primary' }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.buttonText, !isPrimary && styles.buttonTextSecondary]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {children}
    </Text>
  );
}

export const typography = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, color: colors.text, lineHeight: 22 },
  muted: { fontSize: 14, color: colors.muted },
});

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, gap: 16, backgroundColor: colors.background },
  button: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { borderWidth: 1, borderColor: colors.primary },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonTextSecondary: { color: colors.primary },
  error: { color: colors.danger, fontSize: 14 },
});
