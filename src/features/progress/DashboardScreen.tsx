import React, { useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { api } from '../../core/security/apiInterceptor';
import SessionManager from '../../core/security/SessionManager';
import TokenManager from '../../core/security/TokenManager';
import { Loader } from '@shared/components/Loader/Loader';
import { ErrorState } from '@shared/components/ErrorState/ErrorState';
import { ProgressBar } from '@shared/components/ProgressBar/ProgressBar';
import { useDynamicModules, MODULE_IMAGES } from '../../hooks/useDynamicModules';
import { useAppDispatch, useAppSelector } from '@app/store';
import { setModules, setSelectedModule } from '@app/store/slices/moduleSlice';
import { selectActivities } from '@app/store/slices/progressSlice';
import { typography } from '@shared/theme/typography';
import type { DashboardScreenProps } from '@shared/types/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const activities = useAppSelector(selectActivities);
  const { modules, isLoading, error, refetch } = useDynamicModules();

  useEffect(() => {
    if (modules) {
      dispatch(setModules(modules));
    }
  }, [modules, dispatch]);

  const handleModulePress = (moduleId: string) => {
    const module = modules?.find((m) => m.id === moduleId);
    if (module) {
      dispatch(setSelectedModule(module));
      navigation.navigate('ModuleDetail', { moduleId });
    }
  };

  const handleSecurityCheck = async () => {
    try {
      const res = await api.post('/api/protected/data');
      Alert.alert('Security Check Passed ✅', JSON.stringify(res.data, null, 2));
    } catch (error: any) {
      console.error(error);
      Alert.alert('Security Check Failed ❌', error.response?.data?.error || error.message);
    }
  };

  const handleRefreshQueueTest = async () => {
    try {
      // Force 401
      const currentTokens = SessionManager.getActiveTokens();
      if (currentTokens) SessionManager.updateInMemoryTokens({ ...currentTokens, accessToken: 'invalid' });
      
      const p1 = api.post('/api/protected/data', { testId: 1 }).then(() => 'Success 1').catch((e) => `Fail 1`);
      const p2 = api.post('/api/protected/data', { testId: 2 }).then(() => 'Success 2').catch((e) => `Fail 2`);
      const p3 = api.post('/api/protected/data', { testId: 3 }).then(() => 'Success 3').catch((e) => `Fail 3`);

      const results = await Promise.all([p1, p2, p3]);
      Alert.alert('Queue Test Complete', `Results:\n${results.join('\\n')}`);
    } catch (error: any) {
      Alert.alert('Queue Test Failed ❌', error.message);
    }
  };

  const handleReplayTest = async () => {
    try {
      const currentTokens = SessionManager.getActiveTokens();
      if (!currentTokens) return;
      
      const deviceId = await TokenManager.getDeviceId();
      
      const firstRes = await fetch('http://10.243.14.222:3000/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: currentTokens.refreshToken,
          deviceId: deviceId, 
          sessionId: currentTokens.sessionId
        })
      });
      
      const secondRes = await fetch('http://10.243.14.222:3000/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: currentTokens.refreshToken,
          deviceId: deviceId,
          sessionId: currentTokens.sessionId
        })
      });

      const secondData = await secondRes.json();
      Alert.alert(`Replay Status: ${secondRes.status}`, JSON.stringify(secondData, null, 2));
    } catch (error: any) {
      Alert.alert('Replay Test Failed', error.message);
    }
  };

  const handleMismatchTest = async () => {
    try {
      const currentTokens = SessionManager.getActiveTokens();
      if (!currentTokens) return;
      
      const res = await fetch('http://10.243.14.222:3000/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: currentTokens.refreshToken,
          deviceId: 'ATTACKER-DEVICE-ID-1234',
          sessionId: currentTokens.sessionId
        })
      });
      
      const data = await res.json();
      Alert.alert(`Mismatch Status: ${res.status}`, JSON.stringify(data, null, 2));
    } catch (error: any) {
      Alert.alert('Mismatch Test Failed', error.message);
    }
  };

  const handleRefreshAfterLogoutTest = async () => {
    try {
      const currentTokens = SessionManager.getActiveTokens();
      if (!currentTokens) return;

      const deviceId = await TokenManager.getDeviceId();

      // 1. Perform legitimate logout
      await fetch('http://10.243.14.222:3000/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentTokens.sessionId })
      });

      // 2. Try to refresh with the old token
      const refreshRes = await fetch('http://10.243.14.222:3000/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: currentTokens.refreshToken,
          deviceId: deviceId,
          sessionId: currentTokens.sessionId
        })
      });

      const data = await refreshRes.json();
      Alert.alert(`Refresh After Logout: ${refreshRes.status}`, JSON.stringify(data, null, 2));
    } catch (error: any) {
      Alert.alert('Test Failed', error.message);
    }
  };

  const handleRefreshAfterReplayTest = async () => {
    try {
      const currentTokens = SessionManager.getActiveTokens();
      if (!currentTokens) return;

      const deviceId = await TokenManager.getDeviceId();

      // 1. Legitimate user requests refresh (Backend rotates token)
      const firstRes = await fetch('http://10.243.14.222:3000/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: currentTokens.refreshToken,
          deviceId: deviceId,
          sessionId: currentTokens.sessionId
        })
      });

      if (!firstRes.ok) {
         Alert.alert('Test Aborted', 'Please log out and log back in to get a fresh session for this test!');
         return;
      }

      const firstData = (await firstRes.json()) as any;
      const newRefreshToken = firstData.refreshToken; // This is the new active token

      // 2. Attacker replays the OLD token (Backend detects replay and revokes session)
      await fetch('http://10.243.14.222:3000/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: currentTokens.refreshToken, // Old token!
          deviceId: deviceId,
          sessionId: currentTokens.sessionId
        })
      });

      // 3. Legitimate user tries to refresh with their NEW, valid token
      const thirdRes = await fetch('http://10.243.14.222:3000/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: newRefreshToken, // Valid token, but session is dead!
          deviceId: deviceId,
          sessionId: currentTokens.sessionId
        })
      });

      const thirdData = await thirdRes.json();
      Alert.alert(`Refresh After Replay: ${thirdRes.status}`, JSON.stringify(thirdData, null, 2));
    } catch (error: any) {
      Alert.alert('Test Failed', error.message);
    }
  };

  const { completedCount, overallProgress, inProgressModule, testsCompleted, avgScore, dayStreak } = useMemo(() => {
    if (!modules || modules.length === 0) {
      return { completedCount: 0, overallProgress: 0, inProgressModule: null, testsCompleted: 0, avgScore: 0, dayStreak: 0 };
    }
    const completed = modules.filter((m) => m.isCompleted).length;
    const progress = modules.reduce((sum, m) => sum + m.completionPercentage, 0) / modules.length;
    const inProgress = modules.find((m) => !m.isCompleted && !m.isLocked && m.completionPercentage > 0);

    return {
      completedCount: completed,
      overallProgress: progress,
      inProgressModule: inProgress || modules.find((m) => !m.isLocked && !m.isCompleted) || null,
      testsCompleted: 0,
      avgScore: Math.round(progress), // dynamic avgScore based on overall progress
      dayStreak: activities && activities.length > 0 ? Math.min(activities.length, 12) : 0, // dynamic day streak based on activity
    };
  }, [modules, activities]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (isLoading) {
    return <Loader message="Loading modules..." />;
  }

  if (error) {
    return (
      <ErrorState
        type="server"
        message="Failed to load modules."
        onRetry={refetch}
      />
    );
  }

  const recommendedModules = modules?.filter((m) => !m.isCompleted && !m.isLocked) || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Top Graphic Header */}
      <View style={styles.headerBackground}>
        <View style={styles.headerGlow1} />
        <View style={styles.headerGlow2} />
        <View style={styles.greetingRow}>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingText}>{getGreeting()}, Learner 👋</Text>
            <Text style={styles.greetingSubtext}>Let's continue your journey today!</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>🧑‍🎓</Text>
          </View>
        </View>

        {/* Hero Card - Current Module */}
        {inProgressModule && (
          <TouchableOpacity
            style={styles.heroCard}
            activeOpacity={0.9}
            onPress={() => handleModulePress(inProgressModule.id)}
          >
            <View style={styles.heroGlass}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>Continuing</Text>
                </View>
                <Text style={styles.heroMetaIcon}>🎯</Text>
              </View>
              
              <Text style={styles.heroTitle}>{inProgressModule.title}</Text>
              <Text style={styles.heroMeta}>{inProgressModule.duration} • Module</Text>
              
              <View style={styles.heroProgressRow}>
                <ProgressBar
                  percentage={inProgressModule.completionPercentage}
                  color="#60A5FA"
                  trackColor="rgba(255,255,255,0.1)"
                  height={8}
                  style={styles.heroProgressBar}
                />
                <Text style={styles.heroProgressText}>{Math.round(inProgressModule.completionPercentage)}%</Text>
              </View>
              
              <View style={styles.heroContinueRow}>
                <View style={styles.heroButton}>
                  <Text style={styles.heroButtonText}>Resume Learning ▶</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Token Hardening Test Controls */}
        <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <Text style={{ color: 'black', opacity: 0.7, marginBottom: 8 }}>Security Testing</Text>
          <TouchableOpacity style={[styles.heroButton, { backgroundColor: '#3B82F6', marginBottom: 10 }]} onPress={handleRefreshQueueTest}>
            <Text style={styles.heroButtonText}>Refresh Rotation Stress Test</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.heroButton, { backgroundColor: '#F59E0B', marginBottom: 10 }]} onPress={handleReplayTest}>
            <Text style={styles.heroButtonText}>Simulate Stolen Token (Replay)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.heroButton, { backgroundColor: '#EF4444', marginBottom: 10 }]} onPress={handleMismatchTest}>
            <Text style={styles.heroButtonText}>Simulate Device Mismatch</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.heroButton, { backgroundColor: '#8B5CF6', marginBottom: 10 }]} onPress={handleRefreshAfterLogoutTest}>
            <Text style={styles.heroButtonText}>Refresh After Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.heroButton, { backgroundColor: '#EC4899', marginBottom: 10 }]} onPress={handleRefreshAfterReplayTest}>
            <Text style={styles.heroButtonText}>Refresh After Replay</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrapper, {backgroundColor: 'rgba(59, 130, 246, 0.1)'}]}>
              <Text style={styles.statIcon}>🔥</Text>
            </View>
            <Text style={styles.statValue}>{dayStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrapper, {backgroundColor: 'rgba(16, 185, 129, 0.1)'}]}>
              <Text style={styles.statIcon}>🏆</Text>
            </View>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrapper, {backgroundColor: 'rgba(139, 92, 246, 0.1)'}]}>
              <Text style={styles.statIcon}>⭐</Text>
            </View>
            <Text style={styles.statValue}>{avgScore}%</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
        </View>

        {/* Recommended Next */}
        {recommendedModules.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Up Next For You</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendedScroll}
            >
              {recommendedModules.map((mod, index) => (
                <TouchableOpacity
                  key={mod.id}
                  style={styles.recommendedCard}
                  activeOpacity={0.8}
                  onPress={() => handleModulePress(mod.id)}
                >
                  <View style={styles.recommendedImageContainer}>
                    <Image 
                      source={MODULE_IMAGES[mod.id] || require('../../assets/images/react-native.png')} 
                      style={styles.recommendedImage}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.recommendedInfo}>
                    <Text style={styles.recommendedTitle} numberOfLines={2}>{mod.title}</Text>
                    <View style={styles.recommendedMetaRow}>
                      <Text style={styles.recommendedMeta}>⏱ {mod.duration}</Text>
                      <View style={styles.recommendedPlayBtn}>
                        <Text style={styles.recommendedPlayBtnText}>▶</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Security V&V Test Button */}
        <View style={{ marginHorizontal: 24, marginBottom: 32, gap: 12 }}>
          <TouchableOpacity 
            style={{
              backgroundColor: '#10B981',
              padding: 16,
              borderRadius: 16,
              alignItems: 'center'
            }}
            onPress={handleSecurityCheck}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Test Protected API (HMAC)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{
              backgroundColor: '#F59E0B',
              padding: 16,
              borderRadius: 16,
              alignItems: 'center'
            }}
            onPress={handleRefreshQueueTest}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Test Token Refresh Queue</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            {activities.length > 0 ? (
              activities.slice(0, 5).map((activity) => (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={[styles.activityIconBg, { backgroundColor: activity.type === 'quiz_completed' ? '#F0FDF4' : '#EFF6FF' }]}>
                    <Text style={styles.activityIcon}>
                      {activity.type === 'quiz_completed' ? '✅' : activity.type === 'certificate_earned' ? '🎓' : '📖'}
                    </Text>
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activitySubtext}>{activity.type === 'video_watched' ? 'Video Lesson' : 'Learning App'}</Text>
                  </View>
                  <Text style={styles.activityTime}>{activity.date}</Text>
                </View>
              ))
            ) : (
              <View style={styles.activityCard}>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>No recent activity</Text>
                  <Text style={styles.activitySubtext}>Start a module to see your activity here!</Text>
                </View>
              </View>
            )}
          </View>
        </View>
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
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGlow1: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    transform: [{ scaleX: 1.5 }],
  },
  headerGlow2: {
    position: 'absolute',
    bottom: -50,
    right: -20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60, // For status bar + notch
    paddingBottom: 24,
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingText: {
    ...typography.h2,
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  greetingSubtext: {
    ...typography.body,
    color: '#94A3B8',
    marginTop: 6,
    fontSize: 15,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: {
    fontSize: 24,
  },
  heroCard: {
    marginHorizontal: 24,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroGlass: {
    padding: 24,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  heroBadgeText: {
    ...typography.caption,
    color: '#93C5FD',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroMetaIcon: {
    fontSize: 20,
  },
  heroTitle: {
    ...typography.h2,
    color: '#FFFFFF',
    fontSize: 22,
    marginBottom: 6,
  },
  heroMeta: {
    ...typography.body,
    color: '#94A3B8',
    marginBottom: 20,
  },
  heroProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroProgressBar: {
    flex: 1,
    marginRight: 12,
  },
  heroProgressText: {
    color: '#93C5FD',
    fontWeight: '700',
    fontSize: 14,
  },
  heroContinueRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  heroButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 32,
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    ...typography.h2,
    color: '#1E293B',
    fontSize: 22,
    marginBottom: 4,
  },
  statLabel: {
    ...typography.caption,
    color: '#64748B',
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    ...typography.h3,
    color: '#1E293B',
    fontSize: 20,
  },
  seeAllText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 14,
  },
  recommendedScroll: {
    paddingHorizontal: 24,
    gap: 16,
  },
  recommendedCard: {
    width: SCREEN_WIDTH * 0.65,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  recommendedImageContainer: {
    height: 120,
    width: '100%',
    overflow: 'hidden',
  },
  recommendedImage: {
    width: '100%',
    height: '100%',
  },
  recommendedInfo: {
    padding: 20,
  },
  recommendedTitle: {
    ...typography.bodyMedium,
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
  recommendedMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendedMeta: {
    ...typography.caption,
    color: '#64748B',
    fontWeight: '500',
  },
  recommendedPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendedPlayBtnText: {
    color: '#3B82F6',
    fontSize: 12,
    marginLeft: 2,
  },
  activityList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  activityIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityIcon: {
    fontSize: 20,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    ...typography.bodyMedium,
    color: '#1E293B',
    fontWeight: '700',
    marginBottom: 4,
  },
  activitySubtext: {
    ...typography.caption,
    color: '#64748B',
  },
  activityTime: {
    ...typography.caption,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
