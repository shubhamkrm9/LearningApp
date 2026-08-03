/**
 * Learning Module SDK - AssessmentScreen
 */

import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, Alert } from 'react-native';
import { Header } from '@shared/components/Header/Header';
import { Button } from '@shared/components/Button/Button';
import { SCQQuestion } from '@shared/components/Assessment/SCQQuestion';
import { MCQQuestion } from '@shared/components/Assessment/MCQQuestion';
import { TrueFalseQuestion } from '@shared/components/Assessment/TrueFalseQuestion';
import { Loader } from '@shared/components/Loader/Loader';
import { ErrorState } from '@shared/components/ErrorState/ErrorState';
import { useGetAssessmentQuery, useSubmitAssessmentMutation } from '@data/datasources/assessmentApi';
import { useAppDispatch, useAppSelector } from '@app/store';
import {
  setAssessment,
  saveAnswer,
  setAssessmentResult,
  nextQuestion,
  previousQuestion,
  selectCurrentQuestionIndex,
  selectAnswers,
} from '@app/store/slices/assessmentSlice';
import { colors } from '@shared/theme/colors';
import { spacing } from '@shared/theme/spacing';
import { typography } from '@shared/theme/typography';
import type { AssessmentScreenProps } from '@shared/types/navigation';
import type { AnswerPayload } from '@shared/types/assessment';

export const AssessmentScreen: React.FC<AssessmentScreenProps> = ({
  route,
  navigation,
}) => {
  const { assessmentId, moduleId } = route.params;
  const dispatch = useAppDispatch();

  const { data: assessment, isLoading, error, refetch } = useGetAssessmentQuery(assessmentId);
  const [submitAssessment, { isLoading: isSubmitting }] = useSubmitAssessmentMutation();

  const currentIndex = useAppSelector(selectCurrentQuestionIndex);
  const answers = useAppSelector(selectAnswers);

  useEffect(() => {
    if (assessment) {
      dispatch(
        setAssessment({
          assessmentId,
          totalQuestions: assessment.questions.length,
        })
      );
    }
  }, [assessment, assessmentId, dispatch]);

  const handleBack = () => {
    Alert.alert(
      'Exit Assessment?',
      'Your progress will be lost. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleAnswerSelect = (questionId: string, answer: string, isMulti = false) => {
    let current = answers[questionId] || [];
    if (isMulti) {
      if (current.includes(answer)) {
        current = current.filter((a: string) => a !== answer);
      } else {
        current = [...current, answer];
      }
    } else {
      current = [answer];
    }
    dispatch(saveAnswer({ questionId, selectedAnswers: current }));
  };

  const handleSubmit = async () => {
    if (!assessment) return;

    // Build payload
    const payload: AnswerPayload[] = assessment.questions.map((q) => ({
      questionId: q.id,
      selectedAnswers: answers[q.id] || [],
    }));

    try {
      const result = await submitAssessment({
        assessmentId,
        answers: payload,
      }).unwrap();

      dispatch(
        setAssessmentResult({
          score: result.score,
          passed: result.passed,
        })
      );

      navigation.replace('AssessmentResult', {
        assessmentId,
        moduleId,
        score: result.score,
        passed: result.passed,
        minimumRequired: result.minimumRequired,
      });
    } catch {
      Alert.alert('Error', 'Failed to submit assessment. Please try again.');
    }
  };

  if (isLoading) return <Loader message="Loading Assessment..." />;
  if (error || !assessment)
    return <ErrorState message="Failed to load assessment" onRetry={refetch} />;

  const question = assessment.questions[currentIndex];
  if (!question) return null;
  const isLastQuestion = currentIndex === assessment.questions.length - 1;
  const currentAnswer = answers[question.id] || [];

  const renderQuestion = () => {
    switch (question.type) {
      case 'SCQ':
        return (
          <SCQQuestion
            question={question.question}
            options={question.options}
            selectedAnswer={currentAnswer[0] || null}
            onSelect={(ans) => handleAnswerSelect(question.id, ans, false)}
          />
        );
      case 'MCQ':
        return (
          <MCQQuestion
            question={question.question}
            options={question.options}
            selectedAnswers={currentAnswer}
            onToggle={(ans) => handleAnswerSelect(question.id, ans, true)}
          />
        );
      case 'TRUE_FALSE':
        return (
          <TrueFalseQuestion
            question={question.question}
            selectedAnswer={currentAnswer[0] || null}
            onSelect={(ans) => handleAnswerSelect(question.id, ans, false)}
          />
        );
      default:
        return null;
    }
  };

  const isCurrentQuestionAnswered = currentAnswer.length > 0;

  return (
    <View style={styles.container}>
      <Header title="Assessment" onBack={handleBack} />
      
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>
          Question {currentIndex + 1} of {assessment.questions.length}
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderQuestion()}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.navRow}>
          <Button
            title="Previous"
            variant="secondary"
            onPress={() => dispatch(previousQuestion())}
            disabled={currentIndex === 0 || isSubmitting}
            style={styles.navButton}
          />
          {isLastQuestion ? (
            <Button
              title="Submit"
              onPress={handleSubmit}
              disabled={!isCurrentQuestionAnswered || isSubmitting}
              loading={isSubmitting}
              style={styles.navButton}
            />
          ) : (
            <Button
              title="Next"
              onPress={() => dispatch(nextQuestion())}
              disabled={!isCurrentQuestionAnswered}
              style={styles.navButton}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressHeader: {
    padding: spacing.base,
    backgroundColor: colors.surfaceVariant,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  progressText: {
    ...typography.label,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  footer: {
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  navButton: {
    flex: 1,
  },
});
