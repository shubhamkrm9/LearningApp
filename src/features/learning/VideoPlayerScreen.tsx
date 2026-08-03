import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import type { OnProgressData } from 'react-native-video';
import { useGetModuleDetailsQuery } from '@data/datasources/moduleApi';
import { useUpdateVideoProgressMutation } from '@data/datasources/progressApi';
import { useAppDispatch } from '@app/store';
import { updateProgress, markLessonCompleted, resetLessonProgress } from '@app/store/slices/progressSlice';
import { VIDEO_COMPLETION_THRESHOLD, PROGRESS_MILESTONES } from '@shared/utils';
import { typography } from '@shared/theme/typography';
import type { VideoPlayerScreenProps } from '@shared/types/navigation';
import { Loader } from '@shared/components/Loader/Loader';
import { ErrorState } from '@shared/components/ErrorState/ErrorState';

export const VideoPlayerScreen: React.FC<VideoPlayerScreenProps> = ({
  route,
  navigation,
}) => {
  const { moduleId, videoId } = route.params;
  const dispatch = useAppDispatch();
  const videoRef = useRef<any>(null);
  
  const [updateProgressMutation] = useUpdateVideoProgressMutation();
  const { data: moduleDetail, isLoading, error } = useGetModuleDetailsQuery(moduleId);
  
  const [lastMilestone, setLastMilestone] = useState(0);
  const maxWatchedPosition = useRef<number>(0);

  const [isPaused, setIsPaused] = useState(false);
  const isCompletedRef = useRef<boolean>(false);

  const videoData = moduleDetail?.videos?.find((v) => v.id === videoId);

  // Unmount penalty logic: wipe progress if user exits before completing
  useEffect(() => {
    return () => {
      // If component unmounts and video wasn't completed, reset progress to 0
      if (!isCompletedRef.current && maxWatchedPosition.current > 0) {
        dispatch(resetLessonProgress({ moduleId, videoId }));
      }
    };
  }, [moduleId, videoId, dispatch]);

  const handleBack = () => {
    navigation.goBack();
  };

  const togglePlayPause = () => {
    setIsPaused(!isPaused);
  };

  const onProgress = (data: OnProgressData) => {
    if (!data.seekableDuration || data.seekableDuration === 0) return;
    
    const currentTime = data.currentTime;
    
    // Check if the user skipped ahead (tolerance of 3 seconds for regular progress intervals)
    if (currentTime > maxWatchedPosition.current + 3) {
      // User skipped! Revert video back to maxWatchedPosition
      if (videoRef.current) {
        videoRef.current.seek(maxWatchedPosition.current);
      }
      return; // Do not update progress
    }
    
    // Update maxWatchedPosition
    if (currentTime > maxWatchedPosition.current) {
      maxWatchedPosition.current = currentTime;
    }

    const percentage = (maxWatchedPosition.current / data.seekableDuration) * 100;
    dispatch(updateProgress(percentage));

    // Find if we crossed a new milestone (10, 20, 30...)
    const currentMilestone = PROGRESS_MILESTONES.slice().reverse().find((m) => percentage >= m) || 0;
    
    if (currentMilestone > lastMilestone) {
      setLastMilestone(currentMilestone);
      // Sync progress to backend
      updateProgressMutation({
        moduleId,
        videoId,
        watchedPercentage: currentMilestone,
      }).catch(err => console.warn('Failed to sync progress', err));
    }

    if (percentage >= VIDEO_COMPLETION_THRESHOLD && !isCompletedRef.current) {
      isCompletedRef.current = true;
      dispatch(markLessonCompleted({
        lessonId: videoId,
        moduleId,
        title: videoData?.title || 'Video',
        totalVideos: moduleDetail?.videos?.length || 1
      }));

      // Auto-redirect to assessment if this was the last video
      if (moduleDetail?.videos && moduleDetail.assessment) {
        const otherVideos = moduleDetail.videos.filter(v => v.id !== videoId);
        const allOthersCompleted = otherVideos.every(v => v.isCompleted);
        
        if (allOthersCompleted) {
          // Add a slight delay for better UX before jumping
          setTimeout(() => {
            navigation.replace('Assessment', {
              moduleId,
              assessmentId: moduleDetail.assessment!.id,
            });
          }, 1000);
        }
      }
    }
  };

  if (isLoading) {
    return <Loader message="Loading video..." />;
  }

  if (error || !videoData) {
    return <ErrorState message="Failed to load video" onRetry={handleBack} retryLabel="Go Back" />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{videoData.title}</Text>
        <View style={styles.headerSpacer} />
      </SafeAreaView>

      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={require('../../assets/video/sample.mp4')}
          style={styles.video}
          controls={false}
          paused={isPaused}
          resizeMode="contain"
          onProgress={onProgress}
          progressUpdateInterval={1000}
          ignoreSilentSwitch="ignore"
        />
        
        {/* Custom Premium Controls Overlay */}
        <View style={styles.overlay}>
          <TouchableOpacity 
            style={styles.centerPlayButton} 
            onPress={togglePlayPause}
            activeOpacity={0.8}
          >
            <View style={styles.playIconBg}>
              <Text style={styles.playIcon}>{isPaused ? '▶' : '⏸'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.infoContainer}>
        <View style={styles.infoCard}>
          <View style={styles.warningBadge}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>Strict Tracking Active</Text>
          </View>
          <Text style={styles.infoTitle}>Video Rules</Text>
          <Text style={styles.infoDesc}>
            1. You cannot skip ahead. Forward/backward controls are disabled.{'\n'}
            2. You must watch until the end to mark this complete.{'\n'}
            3. If you leave early, your progress will be reset to 0%.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  headerTitle: {
    flex: 1,
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    position: 'relative',
  },
  video: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  centerPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  playIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    marginLeft: 4, // centering offset for play icon
  },
  infoContainer: {
    padding: 24,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  warningIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  warningText: {
    ...typography.caption,
    color: '#DC2626',
    fontWeight: '700',
  },
  infoTitle: {
    ...typography.h3,
    color: '#1E293B',
    marginBottom: 12,
  },
  infoDesc: {
    ...typography.body,
    color: '#64748B',
    lineHeight: 24,
  },
});
