import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, FontSizes, Spacing } from '@/constants/theme';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  style,
}) => {
  return (
    <View
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        style,
      ]}
    >
      <Text style={[styles.text, styles[`text_${variant}`], styles[`text_${size}`]]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
  },

  // Sizes
  size_sm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  size_md: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
  },

  // Variants
  default: {
    backgroundColor: Colors.surface,
  },
  primary: {
    backgroundColor: Colors.primary + '20',
  },
  secondary: {
    backgroundColor: Colors.secondary + '20',
  },
  success: {
    backgroundColor: Colors.success + '20',
  },
  warning: {
    backgroundColor: Colors.warning + '20',
  },
  error: {
    backgroundColor: Colors.error + '20',
  },

  // Text
  text: {
    fontWeight: '500',
  },
  text_sm: {
    fontSize: FontSizes.xs,
  },
  text_md: {
    fontSize: FontSizes.sm,
  },
  text_default: {
    color: Colors.textSecondary,
  },
  text_primary: {
    color: Colors.primary,
  },
  text_secondary: {
    color: Colors.secondary,
  },
  text_success: {
    color: Colors.success,
  },
  text_warning: {
    color: Colors.warning,
  },
  text_error: {
    color: Colors.error,
  },
});
