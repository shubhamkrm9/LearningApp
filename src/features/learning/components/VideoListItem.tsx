import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { ProgressBar } from '@shared/components/ProgressBar/ProgressBar';
import type { VideoLesson } from '@shared/types/module';
import { typography } from '@shared/theme/typography';
import { MODULE_IMAGES } from '../../../hooks/useDynamicModules';

export interface VideoListItemProps {
  video: VideoLesson;
  index: number;
  moduleId?: string;
  onPress: (videoId: string) => void;
}

export const VideoListItem: React.FC<VideoListItemProps> = ({
  video,
  index,
  moduleId,
  onPress,
}) => {
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, video.isCompleted && styles.containerCompleted]}
      onPress={() => onPress(video.id)}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View style={styles.thumbnailContainer}>
        <Image 
          source={moduleId ? MODULE_IMAGES[moduleId] : require('../../../assets/images/react-native.png')} 
          style={styles.thumbnailImage} 
        />
        <View style={styles.playOverlay}>
          <Text style={styles.playIcon}>{video.isCompleted ? '🔄' : '▶'}</Text>
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
        </View>
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {index + 1}. {video.title}
          </Text>
          {video.isCompleted && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedIcon}>✅</Text>
            </View>
          )}
        </View>
        <View style={styles.progressRow}>
          <ProgressBar
            percentage={video.isCompleted ? 100 : 0}
            color={video.isCompleted ? '#10B981' : '#3B82F6'}
            trackColor="#F1F5F9"
            style={styles.progress}
            height={6}
          />
          <Text style={styles.progressText}>{video.isCompleted ? 100 : 0}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  containerCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  thumbnailContainer: {
    width: 90,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 16,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 24,
    color: '#FFF',
    opacity: 0.9,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    ...typography.bodyMedium,
    color: '#1E293B',
    fontWeight: '600',
    lineHeight: 20,
    marginRight: 8,
  },
  completedBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    padding: 4,
  },
  completedIcon: {
    fontSize: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progress: {
    flex: 1,
    marginRight: 12,
  },
  progressText: {
    ...typography.caption,
    color: '#64748B',
    fontWeight: '600',
    width: 30,
    textAlign: 'right',
  },
});
