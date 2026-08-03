import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Loader } from '@shared/components/Loader/Loader';
import { ErrorState } from '@shared/components/ErrorState/ErrorState';
import { ProgressBar } from '@shared/components/ProgressBar/ProgressBar';
import { useDynamicModules, MODULE_IMAGES } from '../../hooks/useDynamicModules';
import { useAppDispatch } from '@app/store';
import { setSelectedModule } from '@app/store/slices/moduleSlice';
import { colors } from '@shared/theme/colors';
import { typography } from '@shared/theme/typography';

const CATEGORIES = ['All', 'Mobile', 'Frontend', 'Backend', 'Cloud'];

export const ModulesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { modules, isLoading, error, refetch } = useDynamicModules();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredModules = useMemo(() => {
    if (!modules) return [];
    let filtered = modules;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter((m) => m.category === selectedCategory);
    }

    return filtered;
  }, [modules, searchQuery, selectedCategory]);

  const handleModulePress = (moduleId: string) => {
    const module = modules?.find((m) => m.id === moduleId);
    if (module && !module.isLocked) {
      dispatch(setSelectedModule(module));
      navigation.navigate('ModuleDetail', { moduleId });
    }
  };

  if (isLoading) return <Loader message="Loading modules..." />;
  if (error) return <ErrorState type="server" message="Failed to load modules." onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Header Background */}
      <View style={styles.headerBackground}>
        <View style={styles.headerGlow} />
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerSafeArea}>
          <Text style={styles.headerTitle}>Explore Modules</Text>
          <Text style={styles.headerSubtitle}>Discover new skills to level up your career.</Text>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="What do you want to learn?"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.contentContainer}>
        {/* Category Filter Chips */}
        <View style={styles.categoryWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScrollView}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Module Cards */}
        <ScrollView
          style={styles.modulesList}
          contentContainerStyle={styles.modulesContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredModules.map((mod, index) => (
            <TouchableOpacity
              key={mod.id}
              style={[styles.moduleCard, mod.isLocked && styles.moduleCardLocked]}
              activeOpacity={mod.isLocked ? 1 : 0.8}
              onPress={() => handleModulePress(mod.id)}
            >
              {/* Thumbnail */}
              <View style={styles.moduleImageContainer}>
                <Image 
                  source={MODULE_IMAGES[mod.id] || require('../../assets/images/react-native.png')} 
                  style={[styles.moduleImage, mod.isLocked && styles.moduleImageLocked]}
                  resizeMode="cover"
                />
                
                {mod.isLocked && (
                  <View style={styles.lockOverlay}>
                    <Text style={styles.lockEmoji}>🔒</Text>
                  </View>
                )}

                {mod.isCompleted && (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedBadgeText}>✓ Done</Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.moduleInfo}>
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>{mod.category}</Text>
                </View>
                
                <Text style={[styles.moduleTitle, mod.isLocked && styles.moduleTextLocked]} numberOfLines={2}>
                  {mod.title}
                </Text>
                <View style={styles.moduleMetaRow}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>📖</Text>
                    <Text style={styles.metaText}>{mod.lessonsCount} lessons</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>⏱</Text>
                    <Text style={styles.metaText}>{mod.duration}</Text>
                  </View>
                </View>

                {/* Progress */}
                <View style={styles.progressContainer}>
                  <View style={styles.moduleProgressRow}>
                    <Text style={styles.moduleProgressLabel}>Progress</Text>
                    <Text style={[
                      styles.moduleProgressValue,
                      mod.completionPercentage > 0 && styles.moduleProgressValueActive,
                    ]}>
                      {mod.completionPercentage}%
                    </Text>
                  </View>
                  <ProgressBar
                    percentage={mod.completionPercentage}
                    color={mod.isCompleted ? '#10B981' : '#3B82F6'}
                    trackColor={mod.isLocked ? '#F1F5F9' : '#DBEAFE'}
                    height={6}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {filteredModules.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>No modules found matching '{searchQuery}'</Text>
            </View>
          )}
        </ScrollView>
      </View>
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
    paddingBottom: 24,
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
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: '#FFFFFF',
    padding: 0,
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
    marginTop: -20,
    paddingTop: 20,
  },
  categoryWrapper: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  categoryScrollView: {
    flexGrow: 0,
  },
  categoryScroll: {
    paddingHorizontal: 24,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryChipText: {
    ...typography.bodyMedium,
    color: '#64748B',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  modulesList: {
    flex: 1,
  },
  modulesContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100,
  },
  moduleCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    padding: 12,
  },
  moduleCardLocked: {
    opacity: 0.65,
    backgroundColor: '#F8FAFC',
  },
  moduleImageContainer: {
    width: 100,
    height: 120,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  moduleImage: {
    width: '100%',
    height: '100%',
  },
  moduleImageLocked: {
    opacity: 0.3,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(241, 245, 249, 0.4)',
  },
  lockEmoji: {
    fontSize: 32,
  },
  completedBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  completedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  moduleInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  categoryTag: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryTagText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  moduleTitle: {
    ...typography.h3,
    color: '#1E293B',
    fontSize: 18,
    marginBottom: 8,
    lineHeight: 24,
  },
  moduleTextLocked: {
    color: '#94A3B8',
  },
  moduleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  metaText: {
    ...typography.caption,
    color: '#64748B',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 'auto',
  },
  moduleProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  moduleProgressLabel: {
    ...typography.caption,
    color: '#64748B',
    fontWeight: '600',
  },
  moduleProgressValue: {
    ...typography.caption,
    color: '#94A3B8',
    fontWeight: '600',
  },
  moduleProgressValueActive: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: '#64748B',
  },
});
