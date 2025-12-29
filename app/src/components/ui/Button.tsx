import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { Colors, BorderRadius, FontSizes, FontWeights, Spacing } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.text}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}` as keyof typeof styles],
              styles[`text_${size}` as keyof typeof styles],
              icon && iconPosition === 'left' ? styles.textWithIconLeft : undefined,
              icon && iconPosition === 'right' ? styles.textWithIconRight : undefined,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },

  // Variants
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Colors.error,
  },

  // Sizes
  size_sm: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  size_md: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
  },
  size_lg: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },

  // Text base
  text: {
    fontWeight: FontWeights.semibold,
  },

  // Text variants
  text_primary: {
    color: Colors.text,
  },
  text_secondary: {
    color: Colors.background,
  },
  text_outline: {
    color: Colors.primary,
  },
  text_ghost: {
    color: Colors.primary,
  },
  text_danger: {
    color: Colors.text,
  },

  // Text sizes
  text_sm: {
    fontSize: FontSizes.sm,
  },
  text_md: {
    fontSize: FontSizes.md,
  },
  text_lg: {
    fontSize: FontSizes.lg,
  },

  // Icon spacing
  textWithIconLeft: {
    marginLeft: Spacing.sm,
  },
  textWithIconRight: {
    marginRight: Spacing.sm,
  },
});
