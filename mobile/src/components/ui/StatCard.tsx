import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { COLORS, SPACING } from '../../constants/config';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = COLORS.primary,
  subtitle,
  trend,
  trendValue,
  onPress,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return COLORS.success;
      case 'down':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
    }
  };

  return (
    <Card style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>

      <Text style={[styles.value, { color }]}>{value}</Text>

      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {trend && trendValue && (
        <View style={styles.trendContainer}>
          <Ionicons
            name={getTrendIcon()}
            size={12}
            color={getTrendColor()}
          />
          <Text style={[styles.trendValue, { color: getTrendColor() }]}>
            {trendValue}
          </Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendValue: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: SPACING.xs,
  },
});