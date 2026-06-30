import React from 'react';
import { View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Card, Button, Badge } from '@/components';
import { Heading, Subheading, BodyText, Caption } from '@/components/Typography';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScrollView className="flex-1 bg-neutral-50 dark:bg-neutral-950" showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View className="bg-primary-600 pt-16 pb-20 px-6 rounded-b-[40px] shadow-lg">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <BodyText className="text-primary-100 font-medium mb-1">{getGreeting()},</BodyText>
            <Heading size="xl" className="text-white">{user?.name || 'Student'} 👋</Heading>
          </View>
          <TouchableOpacity className="w-12 h-12 bg-white/20 rounded-full items-center justify-center border border-white/30 backdrop-blur-md">
            <MaterialIcons name="notifications-none" size={24} color="#ffffff" />
            {/* Notification Dot */}
            <View className="absolute top-3 right-3 w-2.5 h-2.5 bg-error-500 rounded-full border border-primary-600" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content (Shifted up to overlap header) */}
      <View className="px-5 -mt-12">
        {/* Quick Stats Row */}
        <View className="flex-row justify-between mb-6">
          <Card className="flex-1 mr-2 p-4 items-center justify-center border-0 shadow-sm">
            <View className="w-12 h-12 rounded-full bg-success-100 dark:bg-success-900/30 items-center justify-center mb-2">
              <MaterialIcons name="emoji-events" size={24} color="#10b981" />
            </View>
            <Heading size="lg" className="text-neutral-900 dark:text-neutral-50 mb-1">0</Heading>
            <Caption className="text-neutral-900 text-center">Mock Score</Caption>
          </Card>
          
          <Card className="flex-1 ml-2 p-4 items-center justify-center border-0 shadow-sm">
            <View className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 items-center justify-center mb-2">
              <MaterialIcons name="local-fire-department" size={24} color="#4f46e5" />
            </View>
            <Heading size="lg" className="text-neutral-900 dark:text-neutral-50 mb-1">0</Heading>
            <Caption className="text-neutral-900 text-center">Day Streak</Caption>
          </Card>
        </View>

        {/* Quick Actions */}
        <Subheading size="lg" className="mb-4">Quick Actions</Subheading>
        <View className="flex-row justify-between mb-8">
          <TouchableOpacity 
            className="flex-1 bg-white dark:bg-neutral-900 p-4 rounded-2xl items-center mr-2 border border-neutral-100 dark:border-neutral-800 shadow-sm"
            onPress={() => router.push('/(tabs)/practice-setup')}
          >
            <View className="w-14 h-14 rounded-full bg-primary-50 dark:bg-primary-900/20 items-center justify-center mb-3">
              <MaterialIcons name="menu-book" size={28} color="#4f46e5" />
            </View>
            <BodyText className="font-semibold text-center mb-1">Practice</BodyText>
            <Caption className="text-neutral-900 text-center">Topic by topic</Caption>
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-1 bg-white dark:bg-neutral-900 p-4 rounded-2xl items-center ml-2 border border-neutral-100 dark:border-neutral-800 shadow-sm"
            onPress={() => router.push('/(tabs)/mock-setup')}
          >
            <View className="w-14 h-14 rounded-full bg-secondary-50 dark:bg-secondary-900/20 items-center justify-center mb-3">
              <MaterialIcons name="timer" size={28} color="#e11d48" />
            </View>
            <BodyText className="font-semibold text-center mb-1">Take Mock</BodyText>
            <Caption className="text-neutral-900 text-center">Full exam</Caption>
          </TouchableOpacity>
        </View>

        {/* Recent Activity Placeholder */}
        <View className="flex-row justify-between items-end mb-4">
          <Subheading size="lg">Recent Activity</Subheading>
          <TouchableOpacity>
            <BodyText className="text-primary-600 font-medium text-sm">View All</BodyText>
          </TouchableOpacity>
        </View>
        
        <Card variant="bordered" padding="md" className="mb-10 items-center py-10">
          <View className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center mb-4">
            <MaterialIcons name="history" size={32} color={isDark ? '#a1a1aa' : '#a1a1aa'} />
          </View>
          <BodyText className="font-medium text-center mb-2">No activity yet</BodyText>
          <Caption className="text-neutral-900 text-center px-4">
            Your recent practice sessions and mock exam results will appear here.
          </Caption>
        </Card>
      </View>
    </ScrollView>
  );
}
