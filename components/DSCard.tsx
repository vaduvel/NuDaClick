import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '../theme';

// ─── Types ───────────────────────────────────────────────────────────
type CardVariant = 'default' | 'surface' | 'risk' | 'input';

interface DSCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  /** Override border color (e.g. with a risk color) */
  accentColor?: string;
  padding?: number;
  marginBottom?: number;
  style?: ViewStyle;
}

// ─── Component ───────────────────────────────────────────────────────
export default function DSCard({
  children,
  variant = 'default',
  accentColor,
  padding,
  marginBottom,
  style,
}: DSCardProps) {
  const bg = {
    default: Colors.bg.card,
    surface: Colors.bg.surface,
    risk:    Colors.bg.card,
    input:   Colors.bg.input,
  }[variant];

  const border = accentColor ?? {
    default: Colors.border.default,
    surface: Colors.border.subtle,
    risk:    accentColor ?? Colors.border.default,
    input:   Colors.border.default,
  }[variant];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bg, borderColor: border },
        padding !== undefined && { padding },
        marginBottom !== undefined && { marginBottom },
        Shadow.md,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing[5],
    marginBottom: Spacing[5],
    overflow: 'hidden',
  },
});
