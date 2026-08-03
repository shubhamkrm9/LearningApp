import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@shared/types/navigation';

import { LoginScreen } from '@features/auth/LoginScreen';
import { LockScreen } from '@features/auth/LockScreen';
import { MainTabNavigator } from './MainTabNavigator';
import SessionManager, { SessionState } from '../../core/security/SessionManager';
import { ModuleDetailScreen } from '@features/learning/ModuleDetailScreen';
import { VideoPlayerScreen } from '@features/learning/VideoPlayerScreen';
import { AssessmentScreen } from '@features/assessment/AssessmentScreen';
import { AssessmentResultScreen } from '@features/assessment/AssessmentResultScreen';
import { ModuleCompletionScreen } from '@features/learning/ModuleCompletionScreen';
import { CertificateScreen } from '@features/certificates/CertificateScreen';
import { colors } from '@shared/theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const [sessionState, setSessionState] = useState(SessionManager.getState());

  useEffect(() => {
    return SessionManager.subscribe(setSessionState);
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        {sessionState === SessionState.LOCKED ? (
          <Stack.Screen name="Lock" component={LockScreen} />
        ) : sessionState === SessionState.LOGGED_OUT || sessionState === SessionState.REVOKED || sessionState === SessionState.EXPIRED ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="ModuleDetail" component={ModuleDetailScreen} />
            <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
            <Stack.Screen name="Assessment" component={AssessmentScreen} />
            <Stack.Screen name="AssessmentResult" component={AssessmentResultScreen} />
            <Stack.Screen name="ModuleCompletion" component={ModuleCompletionScreen} />
            <Stack.Screen name="Certificate" component={CertificateScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
