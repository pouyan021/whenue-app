import type { ReactElement, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewProps,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

export const colors = {
  primary: '#2563EB',
  danger: '#DC2626',
  text: '#111827',
  muted: '#6B7280',
  border: '#D1D5DB',
  background: '#FFFFFF',
  surface: '#F3F4F6',
  success: '#059669',
};

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

/** A screen whose content scrolls, for forms and long pages. */
export function ScrollScreen({ children, refreshControl }: { children: ReactNode; refreshControl?: ReactElement }) {
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl as ScrollViewProps['refreshControl']}
    >
      {children}
    </ScrollView>
  );
}

export function Loading() {
  return (
    <Screen style={{ justifyContent: 'center' }}>
      <ActivityIndicator />
    </Screen>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type FieldProps = TextInputProps & { label: string; hint?: string };

/** A labelled text input. Numbers and codes are typed left to right even in Persian. */
export function Field({ label, hint, style, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={[styles.input, style]} {...input} />
      {hint ? <Text style={typography.muted}>{hint}</Text> : null}
    </View>
  );
}

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  children?: ReactNode;
};

/** A checkbox whose label can be a whole paragraph, such as a consent's wording. */
export function Checkbox({ label, checked, onChange, disabled, children }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.checkboxRow, disabled && styles.buttonDisabled]}
    >
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={typography.body}>{label}</Text>
        {children}
      </View>
    </Pressable>
  );
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
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text },
});

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, gap: 16, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: 20, paddingBottom: 40, gap: 16 },
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
  card: { borderRadius: 16, padding: 16, gap: 12, backgroundColor: colors.surface },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  checkboxRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  checkbox: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
