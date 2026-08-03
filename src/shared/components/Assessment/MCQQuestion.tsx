/**
 * Learning Module SDK - MCQ (Multiple Choice Question) Component
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@shared/theme/colors';
import { spacing, borderRadius } from '@shared/theme/spacing';
import { typography } from '@shared/theme/typography';

export interface MCQQuestionProps {
  question: string;
  options: string[];
  selectedAnswers: string[];
  onToggle: (answer: string) => void;
}

export const MCQQuestion: React.FC<MCQQuestionProps> = ({
  question,
  options,
  selectedAnswers,
  onToggle,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.hint}>Select all that apply</Text>
      {options.map((option, index) => {
        const isSelected = selectedAnswers.includes(option);
        return (
          <TouchableOpacity
            key={`${option}-${index}`}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onToggle(option)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
          >
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.base,
  },
  question: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.base,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.small,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
  optionText: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
});
