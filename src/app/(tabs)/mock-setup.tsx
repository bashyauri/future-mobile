import React from 'react';
import { View, ScrollView } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card, Button } from '@/components';
import { Heading, Subheading, BodyText, Caption } from '@/components/Typography';

export default function MockSetupScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View className="pt-16 pb-6 px-6 bg-error-600 rounded-b-[40px] shadow-lg">
        <Heading size="xl" className="text-white mb-2">Full Mock Exam</Heading>
        <BodyText className="text-error-100">
          Experience the real UTME environment. No pausing, no cheating.
        </BodyText>
      </View>

      <ScrollView className="flex-1 px-4 pt-8" showsVerticalScrollIndicator={false}>
        {/* Exam Details Card */}
        <Card variant="bordered" padding="lg" className="mb-8 bg-white dark:bg-neutral-900 border-error-100 dark:border-error-900/30">
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-error-50 dark:bg-error-900/30 items-center justify-center mr-3">
                <MaterialCommunityIcons name="clock-outline" size={20} color="#e11d48" />
              </View>
              <View>
                <Caption className="text-neutral-500 uppercase tracking-wider font-bold mb-1">Duration</Caption>
                <BodyText className="font-semibold text-lg">120 Minutes</BodyText>
              </View>
            </View>
            
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-error-50 dark:bg-error-900/30 items-center justify-center mr-3">
                <MaterialCommunityIcons name="format-list-numbered" size={20} color="#e11d48" />
              </View>
              <View>
                <Caption className="text-neutral-500 uppercase tracking-wider font-bold mb-1">Questions</Caption>
                <BodyText className="font-semibold text-lg">180 Total</BodyText>
              </View>
            </View>
          </View>
          
          <View className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800">
            <Subheading size="sm" className="mb-2">Your Subjects:</Subheading>
            <BodyText className="text-neutral-600 dark:text-neutral-400">
              Use of English (60 Q), Mathematics (40 Q), Physics (40 Q), Chemistry (40 Q)
            </BodyText>
            <Caption className="text-primary-600 dark:text-primary-400 mt-2 font-medium">
              Change in JAMB Setup tab
            </Caption>
          </View>
        </Card>

        {/* Rules Checklist */}
        <Subheading size="md" className="mb-4 px-2">Rules & Requirements</Subheading>
        
        <View className="px-2 mb-24">
          <View className="flex-row items-start mb-4">
            <MaterialIcons name="wifi-off" size={22} color={isDark ? '#a1a1aa' : '#52525b'} style={{ marginTop: 2, marginRight: 12 }} />
            <View className="flex-1">
              <BodyText className="font-medium mb-1">Offline Supported</BodyText>
              <Caption className="text-neutral-500">You do not need internet to take this exam once questions are cached.</Caption>
            </View>
          </View>
          
          <View className="flex-row items-start mb-4">
            <MaterialIcons name="do-not-disturb-alt" size={22} color={isDark ? '#a1a1aa' : '#52525b'} style={{ marginTop: 2, marginRight: 12 }} />
            <View className="flex-1">
              <BodyText className="font-medium mb-1">No Pausing</BodyText>
              <Caption className="text-neutral-500">The timer continues even if you close the app. Do not start unless you have 2 hours free.</Caption>
            </View>
          </View>

          <View className="flex-row items-start mb-4">
            <MaterialIcons name="calculate" size={22} color={isDark ? '#a1a1aa' : '#52525b'} style={{ marginTop: 2, marginRight: 12 }} />
            <View className="flex-1">
              <BodyText className="font-medium mb-1">In-App Calculator</BodyText>
              <Caption className="text-neutral-500">A basic UTME calculator will be provided on screen during the exam.</Caption>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-lg border-t border-neutral-200 dark:border-neutral-800">
        <Button 
          title="Begin Full Mock Exam"
          onPress={() => {}}
          size="lg"
          icon="play-circle-filled"
          className="bg-error-600 active:bg-error-700"
        />
      </View>
    </View>
  );
}
