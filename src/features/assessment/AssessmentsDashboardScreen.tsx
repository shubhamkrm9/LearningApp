import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '@shared/theme/colors';
import { typography } from '@shared/theme/typography';
import { useAppSelector } from '@app/store';
import { selectPastResults } from '@app/store/slices/assessmentSlice';

interface MockAssessmentEntry {
  id: string;
  title: string;
  duration: string;
  questionCount: number;
  moduleId: string;
  score?: number;
  passed?: boolean;
}

const MOCK_ASSESSMENTS: MockAssessmentEntry[] = [
  {
    id: 'assessment_2',
    title: 'Redux Toolkit Mastery - Final Exam',
    duration: '10 mins',
    questionCount: 3,
    moduleId: 'module_2',
    score: 67,
    passed: false,
  },
  {
    id: 'assessment_1',
    title: 'React Native Basics - Quiz 1',
    duration: '15 mins',
    questionCount: 5,
    moduleId: 'module_1',
    score: 90,
    passed: true,
  },
];

export const AssessmentsDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const pastResults = useAppSelector(selectPastResults);

  const getAssessmentStatus = (entry: MockAssessmentEntry) => {
    const result = pastResults[entry.id];
    if (result) {
      return { score: result.lastScore, passed: result.passed };
    }
    if (entry.score !== undefined) {
      return { score: entry.score, passed: entry.passed };
    }
    return null;
  };

  const handleViewResults = (entry: MockAssessmentEntry) => {
    const status = getAssessmentStatus(entry);
    if (status) {
      navigation.navigate('AssessmentResult', {
        assessmentId: entry.id,
        moduleId: entry.moduleId,
        score: status.score,
        passed: status.passed,
        minimumRequired: 75,
      });
    }
  };

  const handleStartAssessment = (entry: MockAssessmentEntry) => {
    navigation.navigate('Assessment', {
      assessmentId: entry.id,
      moduleId: entry.moduleId,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Header Background */}
      <View style={styles.headerBackground}>
        <View style={styles.headerGlow} />
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerSafeArea}>
          <Text style={styles.headerTitle}>Certificates & Tests</Text>
          <Text style={styles.headerSubtitle}>Prove your skills and earn verified certificates.</Text>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoIconContainer}>
            <Text style={styles.infoIcon}>🎓</Text>
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoBannerTitle}>Get Certified!</Text>
            <Text style={styles.infoBannerText}>
              Score 75% or higher on assessments to unlock your certificates.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Available Assessments</Text>

        {/* Assessment Cards */}
        {MOCK_ASSESSMENTS.map((entry) => {
          const status = getAssessmentStatus(entry);
          return (
            <View key={entry.id} style={styles.assessmentCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconBg}>
                  <Text style={styles.cardIcon}>📝</Text>
                </View>
                {status && (
                  <View style={[
                    styles.statusPill, 
                    status.passed ? styles.statusPillPass : styles.statusPillFail
                  ]}>
                    <Text style={[
                      styles.statusPillText,
                      status.passed ? styles.statusPillTextPass : styles.statusPillTextFail
                    ]}>
                      {status.passed ? 'PASSED' : 'FAILED'}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.assessmentTitle}>{entry.title}</Text>
              
              <View style={styles.assessmentMetaRow}>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaIcon}>⏱</Text>
                  <Text style={styles.metaText}>{entry.duration}</Text>
                </View>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaIcon}>❓</Text>
                  <Text style={styles.metaText}>{entry.questionCount} Questions</Text>
                </View>
                {status && (
                  <View style={[styles.metaBadge, { backgroundColor: '#F8FAFC' }]}>
                    <Text style={styles.metaIcon}>🎯</Text>
                    <Text style={[styles.metaText, { color: '#0F172A', fontWeight: '700' }]}>{status.score}%</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                {status ? (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleViewResults(entry)}
                  >
                    <Text style={styles.secondaryButtonText}>View Results</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => handleStartAssessment(entry)}
                  >
                    <Text style={styles.primaryButtonText}>Start Assessment</Text>
                  </TouchableOpacity>
                )}
                
                {status?.passed && (
                  <TouchableOpacity style={styles.certificateButton}>
                    <Text style={styles.certificateIcon}>🏆</Text>
                    <Text style={styles.certificateText}>View Cert</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBackground: {
    backgroundColor: '#0F172A',
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
    overflow: 'hidden',
    zIndex: 10,
    elevation: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  headerGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
  },
  headerSafeArea: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerTitle: {
    ...typography.h1,
    color: '#FFFFFF',
    fontSize: 28,
    marginBottom: 8,
  },
  headerSubtitle: {
    ...typography.body,
    color: '#94A3B8',
    marginBottom: 10,
  },
  scrollView: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 32,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFF6FF',
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoBannerTitle: {
    ...typography.bodyMedium,
    color: '#1E293B',
    fontWeight: '800',
    marginBottom: 4,
  },
  infoBannerText: {
    ...typography.caption,
    color: '#64748B',
    lineHeight: 18,
  },
  sectionTitle: {
    ...typography.h3,
    color: '#1E293B',
    fontSize: 20,
    marginBottom: 16,
  },
  assessmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 20,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusPillPass: {
    backgroundColor: '#DCFCE7',
  },
  statusPillFail: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusPillTextPass: {
    color: '#16A34A',
  },
  statusPillTextFail: {
    color: '#DC2626',
  },
  assessmentTitle: {
    ...typography.h2,
    color: '#1E293B',
    fontSize: 18,
    marginBottom: 16,
    lineHeight: 24,
  },
  assessmentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metaIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  metaText: {
    ...typography.caption,
    color: '#64748B',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#3B82F6',
    fontWeight: '700',
    fontSize: 14,
  },
  certificateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  certificateIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  certificateText: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 14,
  },
});
