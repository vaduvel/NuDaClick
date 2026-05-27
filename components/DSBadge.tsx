import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { getDisplayRiskToken, getDisplayRiskBadgeLabel } from '../theme';

// ─── Types ───────────────────────────────────────────────────────────
type BadgeVariant = 'risk' | 'info' | 'channel' | 'custom';
type BadgeSize    = 'sm' | 'md' | 'lg';

interface DSBadgeProps {
  /** For 'risk' variant: pass the risk_level string */
  riskLevel?: string;
  /** For 'custom'/'info'/'channel': explicit label */
  label?: string;
  /** For 'custom': explicit color (main color, bg & border auto-derived) */
  color?: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

const sizePadX: Record<BadgeSize, number> = { sm: 7,  md: 10, lg: 14 };
const sizePadY: Record<BadgeSize, number> = { sm: 3,  md: 5,  lg: 7  };
const sizeFont: Record<BadgeSize, number> = {
  sm: Typography.size.xs,
  md: Typography.size.sm,
  lg: Typography.size.base,
};

// ─── Component ───────────────────────────────────────────────────────
export default function DSBadge({
  riskLevel,
  label,
  color,
  variant  = riskLevel ? 'risk' : 'info',
  size     = 'md',
  style,
}: DSBadgeProps) {
  let displayLabel = label ?? '';
  let mainColor    = color ?? Colors.brand;
  let bgColor      = Colors.brandGlow;
  let borderColor  = Colors.brandBorder;

  if (variant === 'risk' && riskLevel) {
    const tok   = getDisplayRiskToken(riskLevel);
    displayLabel = label ?? getDisplayRiskBadgeLabel(riskLevel);
    mainColor    = tok.main;
    bgColor      = tok.bg;
    borderColor  = tok.border;
  } else if (variant === 'channel') {
    mainColor   = Colors.text.subtle;
    bgColor     = Colors.glass.mid;
    borderColor = Colors.border.subtle;
  } else if (variant === 'custom' && color) {
    mainColor   = color;
    bgColor     = `${color}12`;
    borderColor = `${color}30`;
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor:   bgColor,
          borderColor:       borderColor,
          paddingHorizontal: sizePadX[size],
          paddingVertical:   sizePadY[size],
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: mainColor, fontSize: sizeFont[size] },
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: Typography.weight.extrabold,
    letterSpacing: Typography.tracking.wider,
  },
});
