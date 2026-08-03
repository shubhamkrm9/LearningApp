import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useAppDispatch } from '@app/store';
import { api } from '../../core/security/apiInterceptor';
import TokenManager from '../../core/security/TokenManager';
import SessionManager from '../../core/security/SessionManager';
import SecurityLogger from '../../core/security/SecurityLogger';
import BiometricAuthService from '../../core/security/BiometricAuthService';
import { typography } from '@shared/theme/typography';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@shared/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false);
  const [showEnrollmentPrompt, setShowEnrollmentPrompt] = useState(false);
  const dispatch = useAppDispatch();

  // Animation for biometric button
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  // Pulse animation for biometric button
  useEffect(() => {
    if (isBiometricEnrolled && !isLoading && !isBiometricLoading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isBiometricEnrolled, isLoading, isBiometricLoading]);

  const checkBiometricStatus = async () => {
    try {
      // Check hardware availability
      const availability = await BiometricAuthService.isBiometricAvailable();
      setIsBiometricAvailable(availability.available);

      if (availability.available) {
        // Check enrollment
        const enrollment = await BiometricAuthService.isEnrolled();
        setIsBiometricEnrolled(enrollment.enrolled);

        // Auto-trigger biometric login if enrolled
        if (enrollment.enrolled) {
          handleBiometricLogin();
        }
      }
    } catch (error) {
      SecurityLogger.warn('[LoginScreen] Biometric status check failed:', error);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setIsLoading(true);
    try {
      const deviceId = await TokenManager.getDeviceId();
      
      const response = await api.post('/auth/login', {
        username,
        password,
        deviceId
      });

      const { accessToken, refreshToken, sessionId } = response.data;

      // Initialize session securely
      const tokens = { accessToken, refreshToken, sessionId };
      await TokenManager.setTokens(tokens);
      // This sets state to UNLOCKED, which triggers RootNavigator to render MainTabs
      SessionManager.setSessionActive(tokens);

      // After successful password login, offer biometric enrollment if available but not enrolled
      if (isBiometricAvailable && !isBiometricEnrolled) {
        // Small delay to let the session state propagate, then show enrollment prompt
        setTimeout(() => promptBiometricEnrollment(), 500);
      }

    } catch (error: any) {
      SecurityLogger.error('Login Error:', error);
      Alert.alert('Login Failed', error.response?.data?.error || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = useCallback(async () => {
    if (isBiometricLoading) return;

    setIsBiometricLoading(true);
    try {
      SecurityLogger.info('[LoginScreen] Starting biometric authentication...');
      const tokens = await BiometricAuthService.authenticateWithBiometric();
      
      if (tokens) {
        SecurityLogger.info('[LoginScreen] Biometric login successful.');
        // SessionManager state is already set to UNLOCKED by BiometricAuthService
      } else {
        // Check if locked out
        const lockedUntil = BiometricAuthService.getLockedUntil();
        if (lockedUntil) {
          const secondsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
          Alert.alert(
            'Too Many Attempts',
            `Biometric login is temporarily locked. Please try again in ${secondsLeft} seconds, or use your password.`
          );
        }
        // User cancelled or biometric failed — silently fall back to password UI
      }
    } catch (error: any) {
      SecurityLogger.error('[LoginScreen] Biometric login error:', error);
      Alert.alert(
        'Biometric Failed',
        'Please try again or log in with your password.',
      );
    } finally {
      setIsBiometricLoading(false);
    }
  }, [isBiometricLoading]);

  const promptBiometricEnrollment = () => {
    Alert.alert(
      'Enable Biometric Login',
      'Would you like to use your fingerprint or PIN to log in faster next time?',
      [
        {
          text: 'Not Now',
          style: 'cancel',
        },
        {
          text: 'Enable',
          onPress: async () => {
            setIsLoading(true);
            const success = await BiometricAuthService.enrollBiometric();
            setIsLoading(false);
            if (success) {
              setIsBiometricEnrolled(true);
              Alert.alert(
                'Biometric Enabled ✅',
                'Next time you open the app, you can log in with your fingerprint or device PIN.'
              );
            } else {
              Alert.alert(
                'Enrollment Failed',
                'Biometric enrollment could not be completed. You can try again later from settings.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.backgroundGlow1} />
      <View style={styles.backgroundGlow2} />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/app_icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Learning Module</Text>
        </View>

        <View style={styles.glassCard}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Log in to continue your journey</Text>

          {/* ─── Biometric Login Section ─── */}
          {isBiometricEnrolled && (
            <View style={styles.biometricSection}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.biometricButton,
                    isBiometricLoading && styles.biometricButtonDisabled,
                  ]}
                  activeOpacity={0.7}
                  onPress={handleBiometricLogin}
                  disabled={isBiometricLoading || isLoading}
                >
                  {isBiometricLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="large" />
                  ) : (
                    <>
                      <Text style={styles.biometricIcon}>🔐</Text>
                      <Text style={styles.biometricButtonText}>Login with Biometrics</Text>
                      <Text style={styles.biometricSubtext}>Fingerprint or Device PIN</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* ─── Divider ─── */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or use password</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>
          )}

          {/* ─── Password Login Section ─── */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              placeholderTextColor="#94A3B8"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!isLoading && !isBiometricLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading && !isBiometricLoading}
            />
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleLogin}
            disabled={isLoading || isBiometricLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
  },
  backgroundGlow1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  backgroundGlow2: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  content: {
    paddingHorizontal: 24,
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
    borderRadius: 24,
  },
  appName: {
    ...typography.h1,
    color: '#3B82F6', // Blue color matching UI
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(59, 130, 246, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  title: {
    ...typography.h2,
    color: '#F8FAFC',
    fontSize: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
  },

  // ─── Biometric Section ──────────────────────────────────────────────────

  biometricSection: {
    marginBottom: 8,
  },
  biometricButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  biometricButtonDisabled: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  biometricIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  biometricButtonText: {
    color: '#93C5FD',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 0.3,
  },
  biometricSubtext: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4,
  },

  // ─── Divider ────────────────────────────────────────────────────────────

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 13,
    marginHorizontal: 16,
    fontWeight: '500',
  },

  // ─── Password Section ──────────────────────────────────────────────────

  inputContainer: {
    marginBottom: 20,
  },
  label: {
    ...typography.caption,
    color: '#CBD5E1',
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#F8FAFC',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#1E3A8A',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
