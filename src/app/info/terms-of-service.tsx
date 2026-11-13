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
      content: 'By accessing or using Future Academy, whether through our mobile application or web platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.',
    },
    {
      title: '2. Educational Content & Permitted Use',
      content: 'All materials, including JAMB and WAEC past questions, mock exams, practice quizzes, video lessons, and study guides, are provided solely for personal, non-commercial educational preparation. You may not reproduce, redistribute, scrape, reverse-engineer, or commercially exploit any content from the platform without explicit written authorization.',
    },
    {
      title: '3. User Accounts & Responsibilities',
      content: 'You must provide accurate and complete information when registering. You are responsible for safeguarding your login credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.',
    },
    {
      title: '4. Subscriptions & Billing',
      content: 'Access to certain premium features, complete video lessons, and full CBT mock examination archives requires an active subscription. Subscription fees and billing terms are clearly presented prior to activation. Subscriptions are billed in accordance with the selected plan interval (e.g., monthly or yearly).',
    },
    {
      title: '5. Refund Policy',
      content: 'Due to the immediate digital delivery and consumption of our educational resources, past questions, video content, and automated CBT grading systems, subscription fees are generally non-refundable once activated.\n\nWe provide refunds ONLY under the following strict conditions:\n• Technical errors, platform defects, or major service disruptions directly attributable to Future Academy services prevent you from accessing paid content or utilizing the core services;\n• You notify our support team with documented evidence (such as screenshots or error details) within seven (7) days of the occurrence; AND\n• Our technical support team is unable to rectify or solve the error/major problem within a reasonable timeframe.\n\nRefunds will NOT be granted for:\n• Change of mind or lack of usage after activation;\n• Inability to use the service due to user device incompatibility, lack of internet connection, or user-side connectivity issues;\n• Academic outcomes, examination scores, or admission decisions.\n\nTo request a refund under eligible conditions, please contact our support team at futureacademy-rm@gmail.com or via WhatsApp at +234 707 110 0037 with your registered account email, proof of payment, and details of the unresolved issue.',
    },
    {
      title: '6. Account Deletion & Termination',
      content: 'You may delete your account and associated personal data at any time directly through Settings > Delete Account within the app, or by contacting support. Future Academy reserves the right to suspend or terminate accounts that violate these terms, share credentials, or engage in abusive conduct.',
    },
    {
      title: '7. Intellectual Property',
      content: 'Future Academy, its logos, software code, proprietary question explanations, and educational enhancements are the intellectual property of Ramenshuka Global Resources (RMS GL) (RC: 1919844) and are protected by applicable copyright, trademark, and intellectual property laws.',
    },
    {
      title: '8. Limitation of Liability',
      content: 'While we strive to provide the highest quality exam preparation materials and high platform availability, Future Academy does not guarantee specific exam scores, test results, or admissions outcomes. Services are provided on an "as is" and "as available" basis without warranties of any kind.',
    },
    {
      title: '9. Governing Law',
      content: 'These terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria, without regard to its conflict of law principles.',
    },
    {
      title: '10. Contact Us',
      content: 'For inquiries, assistance, or refund requests regarding these Terms of Service, please contact us at futureacademy-rm@gmail.com, noreply@futureacademy-rm.com, or via WhatsApp at +234 707 110 0037.',
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
