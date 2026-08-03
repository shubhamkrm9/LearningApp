import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@shared/components/Button/Button';
import { useCompleteModuleMutation } from '@data/datasources/progressApi';
import { useAppDispatch } from '@app/store';
import { markModuleCompleted } from '@app/store/slices/progressSlice';
import { typography } from '@shared/theme/typography';
import type { AssessmentResultScreenProps } from '@shared/types/navigation';

export const AssessmentResultScreen: React.FC<AssessmentResultScreenProps> = ({
  route,
  navigation,
}) => {
  const { score, passed, moduleId, minimumRequired } = route.params;
  const dispatch = useAppDispatch();
  const [completeModule, { isLoading }] = useCompleteModuleMutation();

  const handleContinue = async () => {
    if (passed) {
      try {
        const result = await completeModule({ moduleId }).unwrap();
        dispatch(markModuleCompleted(moduleId));
        
        if (result.nextModuleUnlocked || result.moduleCompleted) {
          navigation.replace('ModuleDetail', { moduleId });
        } else {
          navigation.navigate('MainTabs');
        }
      } catch {
        navigation.navigate('MainTabs');
      }
    } else {
      navigation.replace('Assessment', { assessmentId: route.params.assessmentId, moduleId });
    }
  };

  const handleClose = () => {
    navigation.navigate('MainTabs');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Background Graphic */}
      <View style={styles.headerBackground}>
        <View style={styles.headerGlow} />
        <View style={styles.headerGlow2} />
      </View>

      <SafeAreaView style={styles.content} edges={['top', 'bottom']}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, passed ? styles.iconSuccess : styles.iconFail]}>
            <Text style={styles.icon}>{passed ? '🏆' : '😔'}</Text>
          </View>

          <Text style={styles.title}>
            {passed ? 'Congratulations!' : 'Keep Learning!'}
          </Text>
          
          <Text style={styles.subtitle}>
            {passed
              ? 'You have successfully passed the assessment and unlocked your certificate.'
              : 'You did not meet the minimum passing score. Don\'t worry, you can try again!'}
          </Text>

          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>Your Score</Text>
            <Text style={[styles.scoreValue, passed ? styles.textSuccess : styles.textFail]}>
              {score}%
            </Text>
            <Text style={styles.requirementText}>
              Passing Score: {minimumRequired}%
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title={passed ? 'Continue Learning' : 'Retry Assessment'}
            onPress={handleContinue}
            variant={passed ? 'success' : 'primary'}
            loading={isLoading}
            style={styles.actionButton}
          />
          <Button
            title="Back to Dashboard"
            onPress={handleClose}
            variant="secondary"
            disabled={isLoading}
            style={styles.actionButton}
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  headerGlow: {
    position: 'absolute',
    top: -100,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  headerGlow2: {
    position: 'absolute',
    bottom: -100,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    zIndex: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 8,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    marginTop: -80, // overlap out of card
  },
  iconSuccess: {
    backgroundColor: '#DCFCE7',
  },
  iconFail: {
    backgroundColor: '#FEE2E2',
  },
  icon: {
    fontSize: 56,
  },
  title: {
    ...typography.h1,
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 28,
  },
  subtitle: {
    ...typography.body,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  scoreBox: {
    width: '100%',
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  scoreLabel: {
    ...typography.caption,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 72,
    marginBottom: 4,
  },
  textSuccess: {
    color: '#10B981',
  },
  textFail: {
    color: '#EF4444',
  },
  requirementText: {
    ...typography.caption,
    color: '#94A3B8',
    fontWeight: '600',
  },
  footer: {
    marginTop: 40,
    gap: 16,
  },
  actionButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
  },
});
