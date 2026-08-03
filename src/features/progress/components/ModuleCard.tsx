/**
 * Learning Module SDK - ModuleCard
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '@shared/components/Card/Card';
import { ProgressBar } from '@shared/components/ProgressBar/ProgressBar';
import type { Module } from '@shared/types/module';
import { colors } from '@shared/theme/colors';
import { spacing } from '@shared/theme/spacing';
import { typography } from '@shared/theme/typography';

export interface ModuleCardProps {
  moduleData: Module;
  onPress: (moduleId: string) => void;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  moduleData,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => !moduleData.isLocked && onPress(moduleData.id)}
      disabled={moduleData.isLocked}
      style={styles.touchable}
      accessibilityRole="button"
      accessibilityState={{ disabled: moduleData.isLocked }}
      accessibilityLabel={`Module: ${moduleData.title}`}
    >
      <Card locked={moduleData.isLocked} style={styles.card}>
        <View style={styles.headerRow}>
          <Text
            style={[styles.title, moduleData.isLocked && styles.textLocked]}
            numberOfLines={1}
          >
            {moduleData.title}
          </Text>
          {moduleData.isLocked && <Text style={styles.lockIcon}>🔒</Text>}
          {moduleData.isCompleted && <Text style={styles.checkIcon}>✅</Text>}
        </View>

        <Text
          style={[styles.description, moduleData.isLocked && styles.textLocked]}
          numberOfLines={2}
        >
          {moduleData.description}
        </Text>

        <View style={styles.footer}>
          <ProgressBar
            percentage={moduleData.completionPercentage}
            color={moduleData.isCompleted ? colors.success : colors.primary}
            trackColor={moduleData.isLocked ? colors.border : colors.primaryLight}
            style={styles.progress}
          />
          <Text style={styles.progressText}>
            {moduleData.completedVideos}/{moduleData.totalVideos}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    marginBottom: spacing.base,
  },
  card: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    flex: 1,
    marginRight: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  textLocked: {
    color: colors.textDisabled,
  },
  lockIcon: {
    fontSize: 18,
  },
  checkIcon: {
    fontSize: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progress: {
    flex: 1,
    marginRight: spacing.md,
  },
  progressText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 35,
    textAlign: 'right',
  },
});
