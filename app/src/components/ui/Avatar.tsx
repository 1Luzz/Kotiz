import React from 'react';
import { View, Text, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { Colors, FontSizes, FontWeights } from '@/constants/theme';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: string | null;
  name: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

const sizeMap: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const fontSizeMap: Record<AvatarSize, number> = {
  xs: FontSizes.xs,
  sm: FontSizes.sm,
  md: FontSizes.md,
  lg: FontSizes.xl,
  xl: FontSizes.xxxl,
};

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'md',
  style,
}) => {
  const dimension = sizeMap[size];
  const fontSize = fontSizeMap[size];

  // Proteger contre les valeurs undefined/null
  const safeName = name || '?';

  // Générer les initiales
  const initials = safeName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  // Générer une couleur basée sur le nom
  const getColorFromName = (name: string): string => {
    const colors = [
      '#6366F1', // Indigo
      '#8B5CF6', // Violet
      '#EC4899', // Pink
      '#EF4444', // Red
      '#F59E0B', // Amber
      '#10B981', // Emerald
      '#3B82F6', // Blue
      '#14B8A6', // Teal
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (source) {
    return (
      <Image
        source={{ uri: source }}
        style={[
          styles.image,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
          },
          style as ImageStyle,
        ]}
        contentFit="cover"
        transition={200}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: getColorFromName(safeName),
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.surface,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.text,
    fontWeight: FontWeights.semibold,
  },
});
