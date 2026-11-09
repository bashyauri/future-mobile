import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Heading, BodyText, Subheading } from '@/components/Typography';
import { Card } from '@/components';
import { useRouter } from 'expo-router';

export default function TermsOfServiceScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: 'By accessing or using Future Academy, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.',
    },
    {
      title: '2. Educational Content & Permitted Use',
      content: 'All materials, including JAMB and WAEC past questions, mock exams, quizzes, videos, and study guides, are provided solely for personal educational preparation. You may not reproduce, redistribute, or commercially exploit any content from the platform without explicit authorization.',
    },
    {
      title: '3. User Accounts & Responsibilities',
      content: 'You must provide accurate and complete information when registering. You are responsible for safeguarding your login credentials and for all activities that occur under your account.',
    },
    {
      title: '4. Subscriptions & Billing',
      content: 'Certain premium features and full exam archives require an active subscription. Subscription fees and billing terms are clearly presented prior to activation. Subscriptions are billed in accordance with the selected plan interval.',
    },
    {
      title: '5. Account Deletion & Termination',
      content: 'You may delete your account and associated personal data at any time directly through Settings > Delete Account within the app. Future Academy reserves the right to suspend or terminate accounts that violate our terms or engage in abusive conduct.',
    },
    {
      title: '6. Intellectual Property',
      content: 'Future Academy, its logos, software code, and educational enhancements are the intellectual property of Ramenshuka Global Resources (RMS GL) (RC: 1919844) and are protected by applicable intellectual property laws.',
    },
    {
      title: '7. Limitation of Liability',
      content: 'While we strive to provide the highest quality exam preparation materials, Future Academy does not guarantee specific exam scores or admissions outcomes. Services are provided on an "as is" and "as available" basis.',
    },
    {
      title: '8. Governing Law',
      content: 'These terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria.',
    },
    {
      title: '9. Contact Us',
      content: 'For inquiries regarding these Terms of Service, please contact us at futureacademy-rm@gmail.com, noreply@futureacademy-rm.com, or via WhatsApp at +234 707 110 0037.',
    },
  ];

  return (
    <View className={`flex-1 ${isDark ? 'bg-neutral-950' : 'bg-neutral-50'}`}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="mb-4 flex-row items-center"
        >
          <MaterialIcons name="arrow-back" size={24} color={isDark ? '#fafafa' : '#171717'} />
        </TouchableOpacity>

        <Heading size="xl" className="mb-2">Terms of Service</Heading>
        <BodyText variant="subtle" className="mb-6">
          Last Updated: August 2026
        </BodyText>

        <Card variant="bordered" padding="lg" className="bg-white dark:bg-neutral-900 mb-6">
          <BodyText className="mb-4">
            Welcome to Future Academy. These Terms of Service govern your use of our mobile application and related educational services provided by Ramenshuka Global Resources (RMS GL).
          </BodyText>
        </Card>

        {sections.map((section, index) => (
          <Card key={index} variant="bordered" padding="lg" className="bg-white dark:bg-neutral-900 mb-4">
            <Subheading size="lg" className="mb-2">{section.title}</Subheading>
            <BodyText variant="subtle">{section.content}</BodyText>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
