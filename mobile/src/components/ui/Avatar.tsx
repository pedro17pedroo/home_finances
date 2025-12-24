import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'md',
  style,
}) => {
  const { colors } = useTheme();

  const getSizeValue = (): number => {
    switch (size) {
      case 'xs': return 24;
      case 'sm': return 32;
      case 'md': return 40;
      case 'lg': return 56;
      case 'xl': return 80;
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'xs': return 10;
      case 'sm': return 12;
      case 'md': return 16;
      case 'lg': return 20;
      case 'xl': return 28;
    }
  };

  const getIconSize = (): number => {
    switch (size) {
      case 'xs': return 14;
      case 'sm': return 18;
      case 'md': return 22;
      case 'lg': return 28;
      case 'xl': return 40;
    }
  };

  const sizeValue = getSizeValue();
  const fontSize = getFontSize();
  const iconSize = getIconSize();

  const getInitials = (): string => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const containerStyle: ViewStyle = {
    width: sizeValue,
    height: sizeValue,
    borderRadius: sizeValue / 2,
    backgroundColor: colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  };

  if (source) {
    return (
      <View style={[containerStyle, style]}>
        <Image
          source={{ uri: source }}
          style={{ width: sizeValue, height: sizeValue }}
          resizeMode="cover"
        />
      </View>
    );
  }

  if (name) {
    return (
      <View style={[containerStyle, style]}>
        <Text style={{ fontSize, fontWeight: '600', color: colors.primary }}>
          {getInitials()}
        </Text>
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <Ionicons name="person" size={iconSize} color={colors.primary} />
    </View>
  );
};
