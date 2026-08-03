/**
 * Learning Module SDK - CertificateScreen
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Linking, Alert } from 'react-native';
import { Header } from '@shared/components/Header/Header';
import { Loader } from '@shared/components/Loader/Loader';
import { ErrorState } from '@shared/components/ErrorState/ErrorState';
import { Button } from '@shared/components/Button/Button';
import { useGetCertificateQuery } from '@data/datasources/certificateApi';
import { colors } from '@shared/theme/colors';
import { spacing } from '@shared/theme/spacing';
import type { CertificateScreenProps } from '@shared/types/navigation';
import { useAppDispatch } from '@app/store';
import { setCertificate } from '@app/store/slices/certificateSlice';

export const CertificateScreen: React.FC<CertificateScreenProps> = ({
  navigation,
}) => {
  const dispatch = useAppDispatch();
  const { data: certData, isLoading, error, refetch } = useGetCertificateQuery();

  useEffect(() => {
    if (certData) {
      dispatch(
        setCertificate({
          certificateId: certData.certificateId,
          certificateUrl: certData.certificateUrl,
          issuedAt: certData.issuedAt,
        })
      );
    }
  }, [certData, dispatch]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleDownload = async () => {
    if (!certData?.certificateUrl) return;
    try {
      const supported = await Linking.canOpenURL(certData.certificateUrl);
      if (supported) {
        await Linking.openURL(certData.certificateUrl);
      } else {
        Alert.alert('Error', "Don't know how to open this URL");
      }
    } catch {
      Alert.alert('Error', 'Failed to open certificate URL.');
    }
  };

  if (isLoading) {
    return <Loader message="Generating Certificate..." />;
  }

  if (error || !certData) {
    return (
      <ErrorState
        message="Failed to load certificate. Please try again."
        onRetry={refetch}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Your Certificate" onBack={handleBack} />

      <View style={styles.content}>
        <View style={styles.placeholderCard}>
          {/* Real implementation might use react-native-pdf if required, 
              but for now we provide a button to open the PDF URL natively */}
          <Button
            title="View Certificate PDF"
            onPress={handleDownload}
            variant="secondary"
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Download & Share"
          onPress={handleDownload}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderCard: {
    width: '100%',
    height: 400,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionButton: {
    width: '100%',
  },
});
