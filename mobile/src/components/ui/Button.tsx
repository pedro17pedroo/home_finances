import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, RADIUS } from '../../constants/config';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const { colors } = useTheme();

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle; iconColor: string } => {
    switch (variant) {
      case 'primary':
        return {
          container: { backgroundColor: colors.primary },
          text: { color: '#FFFFFF' },
          iconColor: '#FFFFFF',
        };
      case 'secondary':
        return {
          container: { backgroundColor: colors.surfaceSecondary },
          text: { color: colors.text },
          iconColor: colors.text,
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: colors.primary,
          },
          text: { color: colors.primary },
          iconColor: colors.primary,
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          text: { color: colors.primary },
          iconColor: colors.primary,
        };
      case 'danger':
        return {
          container: { backgroundColor: colors.error },
          text: { color: '#FFFFFF' },
          iconColor: '#FFFFFF',
        };
      case 'success':
        return {
          container: { backgroundColor: colors.success },
          text: { color: '#FFFFFF' },
          iconColor: '#FFFFFF',
        };
      default:
        return {
          container: { backgroundColor: colors.primary },
          text: { color: '#FFFFFF' },
          iconColor: '#FFFFFF',
        };
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle; iconSize: number } => {
    switch (size) {
      case 'sm':
        return {
          container: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, minHeight: 36 },
          text: { fontSize: 14 },
          iconSize: 16,
        };
      case 'md':
        return {
          container: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, minHeight: 48 },
          text: { fontSize: 16 },
          iconSize: 20,
        };
      case 'lg':
        return {
          container: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg, minHeight: 56 },
          text: { fontSize: 18 },
          iconSize: 24,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const containerStyle: ViewStyle[] = [
    styles.container,
    sizeStyles.container,
    variantStyles.container,
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyles: TextStyle[] = [
    styles.text,
    sizeStyles.text,
    variantStyles.text,
    textStyle,
  ];

  const renderIcon = (position: 'left' | 'right') => {
    if (!icon || iconPosition !== position) return null;
    return (
      <Ionicons
        name={icon}
        size={sizeStyles.iconSize}
        color={variantStyles.iconColor}
        style={position === 'left' ? styles.iconLeft : styles.iconRight}
      />
    );
  };

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variantStyles.iconColor}
          size={size === 'sm' ? 'small' : 'small'}
        />
      ) : (
        <>
          {renderIcon('left')}
          <Text style={textStyles}>{title}</Text>
          {renderIcon('right')}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: SPACING.sm,
  },
  iconRight: {
    marginLeft: SPACING.sm,
  },
});
