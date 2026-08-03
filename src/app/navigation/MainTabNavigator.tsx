import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '@features/progress/DashboardScreen';
import { ModulesScreen } from '@features/learning/ModulesScreen';
import { AssessmentsDashboardScreen } from '@features/assessment/AssessmentsDashboardScreen';
import { ProgressScreen } from '@features/progress/ProgressScreen';
import { colors } from '@shared/theme/colors';
import { View, Image, StyleSheet } from 'react-native';
import type { MainTabParamList } from '@shared/types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: colors.border,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarIcon: ({ focused }) => {
          let source;
          if (route.name === 'HomeTab') source = require('../../assets/images/tab_home.png');
          else if (route.name === 'ModulesTab') source = require('../../assets/images/tab_modules.png');
          else if (route.name === 'AssessmentsTab') source = require('../../assets/images/tab_assessments.png');
          else if (route.name === 'ProgressTab') source = require('../../assets/images/tab_progress.png');

          return (
            <View style={[styles.iconContainer, focused && styles.iconFocused]}>
              <Image source={source} style={[styles.iconImage, !focused && styles.iconDimmed]} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={DashboardScreen} 
        options={{ tabBarLabel: 'Home' }} 
      />
      <Tab.Screen 
        name="ModulesTab" 
        component={ModulesScreen} 
        options={{ tabBarLabel: 'Modules' }} 
      />
      <Tab.Screen 
        name="AssessmentsTab" 
        component={AssessmentsDashboardScreen} 
        options={{ tabBarLabel: 'Assessments' }} 
      />
      <Tab.Screen 
        name="ProgressTab" 
        component={ProgressScreen} 
        options={{ tabBarLabel: 'Progress' }} 
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  iconFocused: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  iconImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  iconDimmed: {
    opacity: 0.5,
  }
});
