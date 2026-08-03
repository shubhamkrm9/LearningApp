import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar, Alert } from 'react-native';
import SessionManager, { SessionState } from '../../core/security/SessionManager';
import { typography } from '@shared/theme/typography';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@shared/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Lock'>;

export const LockScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlock = async () => {
    setIsLoading(true);
    const success = await SessionManager.unlockSession();
    setIsLoading(false);
    
    if (!success) {
      Alert.alert('Authentication Failed', 'Please try again or log in with your password.');
    }
  };

  const handleLogout = async () => {
    await SessionManager.terminateSession('LOGOUT');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.glassCard}>
        <Text style={styles.title}>Session Locked</Text>
        <Text style={styles.subtitle}>Your session was locked for security.</Text>

        <TouchableOpacity 
          style={styles.primaryButton}
          activeOpacity={0.8}
          onPress={handleUnlock}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Unlock with Biometrics</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          activeOpacity={0.8}
          onPress={handleLogout}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    padding: 24,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    ...typography.h2,
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    ...typography.body,
    color: '#94A3B8',
    marginBottom: 32,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 16,
  },
});
