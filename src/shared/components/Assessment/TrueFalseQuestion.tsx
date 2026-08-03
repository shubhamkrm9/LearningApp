/**
 * Learning Module SDK - True/False Question Component
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@shared/theme/colors';
import { spacing, borderRadius } from '@shared/theme/spacing';
import { typography } from '@shared/theme/typography';

export interface TrueFalseQuestionProps {
  question: string;
  selectedAnswer: string | null;
  onSelect: (answer: string) => void;
}

export const TrueFalseQuestion: React.FC<TrueFalseQuestionProps> = ({
  question,
  selectedAnswer,
  onSelect,
}) => {
  const options = ['True', 'False'];

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question}</Text>
      <View style={styles.optionsRow}>
        {options.map((option) => {
          const isSelected = selectedAnswer === option;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                isSelected && (option === 'True' ? styles.optionTrue : styles.optionFalse),
              ]}
              onPress={() => onSelect(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
    marginBottom: spacing.lg,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
    borderRadius: borderRadius.small,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionTrue: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  optionFalse: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  optionText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
});
