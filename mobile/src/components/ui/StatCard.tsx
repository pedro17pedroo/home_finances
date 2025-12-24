import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, RADIUS } from '../../constants/config';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onPress?: () => void;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  trend,
  onPress,
  style,
}) => {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }, style]}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${iconColor || colors.primary}15` }]}>
            <Ionicons
              name={icon}
              size={20}
              color={iconColor || colors.primary}
            />
          </View>
        )}
        <Text style={[styles.title, { color: colors.textSecondary }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>

      {(subtitle || trend) && (
        <View style={styles.footer}>
          {trend && (
            <View style={[
              styles.trendContainer,
              { backgroundColor: trend.isPositive ? colors.successBackground : colors.errorBackground }
            ]}>
              <Ionicons
                name={trend.isPositive ? 'trending-up' : 'trending-down'}
                size={12}
                color={trend.isPositive ? colors.success : colors.error}
              />
              <Text style={[
                styles.trendText,
                { color: trend.isPositive ? colors.success : colors.error }
              ]}>
                {Math.abs(trend.value)}%
              </Text>
            </View>
          )}
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
  subtitle: {
    fontSize: 11,
  },
});
