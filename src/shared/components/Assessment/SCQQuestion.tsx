/**
 * Learning Module SDK - SCQ (Single Choice Question) Component
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@shared/theme/colors';
import { spacing, borderRadius } from '@shared/theme/spacing';
import { typography } from '@shared/theme/typography';

export interface SCQQuestionProps {
  question: string;
  options: string[];
  selectedAnswer: string | null;
  onSelect: (answer: string) => void;
}

export const SCQQuestion: React.FC<SCQQuestionProps> = ({
  question,
  options,
  selectedAnswer,
  onSelect,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question}</Text>
      {options.map((option, index) => {
        const isSelected = selectedAnswer === option;
        return (
          <TouchableOpacity
            key={`${option}-${index}`}
            style={[styles.option, isSelected && styles.optionSelected]}
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
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
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
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
});
