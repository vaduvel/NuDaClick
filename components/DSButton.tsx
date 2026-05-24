import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';

// ─── Types ───────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface DSButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

// ─── Variant maps ────────────────────────────────────────────────────
const variantBg: Record<ButtonVariant, string> = {
  primary:   Colors.brand,
  secondary: Colors.bg.surface,
  ghost:     Colors.transparent,
  danger:    Colors.risk.high.main,
  success:   Colors.risk.safe.main,
};

const variantBorder: Record<ButtonVariant, string> = {
  primary:   Colors.brand,
  secondary: Colors.border.default,
  ghost:     Colors.border.subtle,
  danger:    Colors.risk.high.border,
  success:   Colors.risk.safe.border,
};

const variantText: Record<ButtonVariant, string> = {
  primary:   Colors.white,
  secondary: Colors.text.secondary,
  ghost:     Colors.text.muted,
  danger:    Colors.white,
  success:   Colors.white,
};

const sizeY: Record<ButtonSize, number> = { sm: 10, md: 14, lg: 16 };
const sizeX: Record<ButtonSize, number> = { sm: 14, md: 18, lg: 22 };
const sizeFont: Record<ButtonSize, number> = {
  sm:  Typography.size.sm,
  md:  Typography.size.base,
  lg:  Typography.size.md,
};

// ─── Component ───────────────────────────────────────────────────────
export default function DSButton({
  label,
  onPress,
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  disabled  = false,
  icon,
  iconRight,
  fullWidth = false,
  style,
  labelStyle,
}: DSButtonProps) {
  const isDisabled = disabled || loading;
  const opacity    = isDisabled ? 0.48 : 1;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.78}
      style={[
        styles.base,
        {
          backgroundColor: variantBg[variant],
          borderColor:     variantBorder[variant],
          paddingVertical:   sizeY[size],
          paddingHorizontal: sizeX[size],
          opacity,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        variant === 'ghost' && styles.ghostExtra,
        Shadow.sm,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantText[variant]} />
      ) : (
        <View style={styles.inner}>
          {icon && <View style={styles.iconLeft}>{icon}</View>}
          <Text
            style={[
              styles.label,
              { color: variantText[variant], fontSize: sizeFont[size] },
              labelStyle,
            ]}
          >
            {label}
          </Text>
          {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostExtra: {
    shadowOpacity: 0,
    elevation: 0,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: Typography.weight.bold,
    letterSpacing: Typography.tracking.wide,
  },
  iconLeft: {
    marginRight: Spacing[2],
  },
  iconRight: {
    marginLeft: Spacing[2],
  },
});
