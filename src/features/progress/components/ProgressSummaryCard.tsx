/**
 * Learning Module SDK - ProgressSummaryCard
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@shared/components/Card/Card';
import { ProgressBar } from '@shared/components/ProgressBar/ProgressBar';
import { colors } from '@shared/theme/colors';
import { spacing, layout } from '@shared/theme/spacing';
import { typography } from '@shared/theme/typography';

export interface ProgressSummaryCardProps {
  totalModules: number;
  completedModules: number;
  overallPercentage: number;
}

export const ProgressSummaryCard: React.FC<ProgressSummaryCardProps> = ({
  totalModules,
  completedModules,
  overallPercentage,
}) => {
  return (
    <Card style={styles.container}>
      <Text style={styles.title}>Your Learning Progress</Text>
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {completedModules} / {totalModules} Modules Completed
        </Text>
        <Text style={styles.percentageText}>{Math.round(overallPercentage)}%</Text>
      </View>
      <ProgressBar percentage={overallPercentage} style={styles.progress} />
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statsText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  percentageText: {
    ...typography.title,
    color: colors.primary,
  },
  progress: {
    marginTop: spacing.xs,
  },
});
