/**
 * Learning Module SDK - Navigation Types
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

export type MainTabParamList = {
  HomeTab: undefined;
  ModulesTab: undefined;
  AssessmentsTab: undefined;
  ProgressTab: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Lock: undefined;
  MainTabs: undefined;
  ModuleDetail: { moduleId: string };
  VideoPlayer: { videoId: string; moduleId: string };
  Assessment: { assessmentId: string; moduleId: string };
  AssessmentResult: {
    score: number;
    passed: boolean;
    assessmentId: string;
    moduleId: string;
    minimumRequired: number;
  };
  ModuleCompletion: { moduleId: string };
  Certificate: undefined;
};

// Types for individual screens
export type DashboardScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'HomeTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type ModulesScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'ModulesTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type AssessmentsDashboardScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'AssessmentsTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type ProgressScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'ProgressTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type ModuleDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ModuleDetail'
>;

export type VideoPlayerScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'VideoPlayer'
>;

export type AssessmentScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Assessment'
>;

export type AssessmentResultScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'AssessmentResult'
>;

export type ModuleCompletionScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ModuleCompletion'
>;

export type CertificateScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Certificate'
>;
