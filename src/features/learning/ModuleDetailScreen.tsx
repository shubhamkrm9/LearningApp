import React from 'react';
import { View, FlatList, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { Header } from '@shared/components/Header/Header';
import { Loader } from '@shared/components/Loader/Loader';
import { ErrorState } from '@shared/components/ErrorState/ErrorState';
import { Button } from '@shared/components/Button/Button';
import { VideoListItem } from './components/VideoListItem';
import { useGetModuleDetailsQuery } from '@data/datasources/moduleApi';
import { useAppDispatch } from '@app/store';
import { setCurrentVideo } from '@app/store/slices/progressSlice';
import { typography } from '@shared/theme/typography';
import type { ModuleDetailScreenProps } from '@shared/types/navigation';

export const ModuleDetailScreen: React.FC<ModuleDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { moduleId } = route.params;
  const dispatch = useAppDispatch();
  const { data: moduleDetail, isLoading, error, refetch } = useGetModuleDetailsQuery(
    moduleId
  );

  const handleBack = () => {
    navigation.goBack();
  };

  const handleVideoPress = (videoId: string) => {
    dispatch(setCurrentVideo({ moduleId, videoId }));
    navigation.navigate('VideoPlayer', { moduleId, videoId });
  };

  const handleAssessmentPress = () => {
    if (moduleDetail?.assessment) {
      navigation.navigate('Assessment', {
        moduleId,
        assessmentId: moduleDetail.assessment.id,
      });
    }
  };

  if (isLoading) {
    return <Loader message="Loading module details..." />;
  }

  if (error || !moduleDetail) {
    return (
      <ErrorState
        type="server"
        message="Failed to load module details."
        onRetry={refetch}
      />
    );
  }

  const allVideosCompleted = moduleDetail.videos.every((v) => v.isCompleted);
  // Strict condition: Only unlocked if exactly 100% video completion
  const isAssessmentUnlocked = allVideosCompleted;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Premium Header */}
      <View style={styles.headerBackground}>
        <View style={styles.headerGlow} />
        <View style={styles.headerSafeArea}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.heroContent}>
          <View style={styles.coverImage}>
            <Text style={styles.coverEmoji}>🚀</Text>
          </View>
          <Text style={styles.heroTitle}>{moduleDetail.title}</Text>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaText}>⏱ {moduleDetail.duration}</Text>
            <Text style={styles.heroMetaText}>📊 {moduleDetail.difficulty}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={moduleDetail.videos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Course Content</Text>
            <View style={styles.progressBadge}>
              <Text style={styles.progressText}>
                {Math.round(moduleDetail.completionPercentage)}% Completed
              </Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <VideoListItem video={item} index={index} moduleId={moduleId} onPress={handleVideoPress} />
        )}
        ListFooterComponent={
          <View style={styles.footerSection}>
            <View style={styles.assessmentCard}>
              <View style={[styles.assessmentIconBg, isAssessmentUnlocked ? styles.unlockedBg : styles.lockedBg]}>
                <Text style={styles.assessmentIcon}>📝</Text>
              </View>
              <Text style={styles.assessmentTitle}>Final Assessment</Text>
              <Text style={styles.assessmentDesc}>
                {isAssessmentUnlocked 
                  ? "You've completed all videos! Ready to test your knowledge?"
                  : "Complete 100% of the videos to unlock this assessment."}
              </Text>
              <TouchableOpacity
                style={[styles.assessmentButton, isAssessmentUnlocked ? styles.buttonUnlocked : styles.buttonLocked]}
                onPress={handleAssessmentPress}
                disabled={!isAssessmentUnlocked}
              >
                <Text style={[styles.assessmentButtonText, !isAssessmentUnlocked && styles.buttonTextLocked]}>
                  {isAssessmentUnlocked ? 'Start Assessment' : 'Locked'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />
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
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
  },
  headerSafeArea: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 10,
  },
  coverImage: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    marginBottom: 16,
  },
  coverEmoji: {
    fontSize: 40,
  },
  heroTitle: {
    ...typography.h1,
    color: '#FFFFFF',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  heroMetaText: {
    ...typography.bodyMedium,
    color: '#94A3B8',
  },
  listContent: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    ...typography.h2,
    color: '#1E293B',
    fontSize: 20,
  },
  progressBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#2563EB',
  },
  footerSection: {
    marginTop: 32,
  },
  assessmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  assessmentIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  unlockedBg: {
    backgroundColor: '#DCFCE7',
  },
  lockedBg: {
    backgroundColor: '#F1F5F9',
  },
  assessmentIcon: {
    fontSize: 32,
  },
  assessmentTitle: {
    ...typography.h2,
    color: '#1E293B',
    fontSize: 20,
    marginBottom: 8,
  },
  assessmentDesc: {
    ...typography.body,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  assessmentButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonUnlocked: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonLocked: {
    backgroundColor: '#F1F5F9',
  },
  assessmentButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonTextLocked: {
    color: '#94A3B8',
  },
});
