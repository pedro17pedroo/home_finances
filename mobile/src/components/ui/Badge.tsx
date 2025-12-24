import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, RADIUS } from '../../constants/config';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  icon,
  style,
}) => {
  const { colors } = useTheme();

  const getVariantStyles = (): { bg: string; text: string } => {
    switch (variant) {
      case 'success':
        return { bg: colors.successBackground, text: colors.success };
      case 'warning':
        return { bg: colors.warningBackground, text: colors.warning };
      case 'error':
        return { bg: colors.errorBackground, text: colors.error };
      case 'info':
        return { bg: colors.infoBackground, text: colors.info };
      case 'primary':
        return { bg: colors.primaryBackground, text: colors.primary };
      default:
        return { bg: colors.surfaceSecondary, text: colors.textSecondary };
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle; iconSize: number } => {
    switch (size) {
      case 'sm':
        return {
          container: { paddingHorizontal: SPACING.sm, paddingVertical: 2 },
          text: { fontSize: 10 },
          iconSize: 10,
        };
      case 'md':
        return {
          container: { paddingHorizontal: SPACING.sm, paddingVertical: 4 },
          text: { fontSize: 12 },
          iconSize: 12,
        };
      case 'lg':
        return {
          container: { paddingHorizontal: SPACING.md, paddingVertical: 6 },
          text: { fontSize: 14 },
          iconSize: 14,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.container,
        sizeStyles.container,
        { backgroundColor: variantStyles.bg },
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={sizeStyles.iconSize}
          color={variantStyles.text}
          style={styles.icon}
        />
      )}
      <Text style={[styles.text, sizeStyles.text, { color: variantStyles.text }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '600',
  },
});
