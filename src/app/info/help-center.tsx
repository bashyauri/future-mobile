import React from 'react';
import { View, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Heading, BodyText, Subheading } from '@/components/Typography';
import { Card } from '@/components';
import { useRouter } from 'expo-router';

export default function HelpCenterScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const helpTopics = [
    {
      id: 1,
      icon: 'school',
      title: 'Getting Started',
      description: 'Learn how to set up your account and start learning',
      route: '/info/help/getting-started',
    },
    {
      id: 2,
      icon: 'quiz',
      title: 'Practice & Quizzes',
      description: 'How to take practice exams and quizzes',
      route: '/info/help/practice-quizzes',
    },
    {
      id: 3,
      icon: 'payment',
      title: 'Subscription & Billing',
      description: 'Manage your subscription and payment methods',
      route: '/info/help/subscription',
    },
    {
      id: 4,
      icon: 'account-circle',
      title: 'Account Settings',
      description: 'Update your profile and preferences',
      route: '/info/help/account',
    },
  ];

  const contactOptions = [
    {
      id: 1,
      icon: 'email',
      title: 'Email Support',
      description: 'support@futureacademy.edu',
      action: () => Linking.openURL('mailto:support@futureacademy.edu'),
    },
    {
      id: 2,
      icon: 'chat',
      title: 'Live Chat',
      description: 'Chat with our support team',
      action: () => {},
    },
    {
      id: 3,
      icon: 'phone',
      title: 'Call Us',
      description: '+234 XXX XXX XXXX',
      action: () => Linking.openURL('tel:+234XXXXXXXXXX'),
    },
  ];

  const FAQData = [
    {
      question: 'How do I reset my password?',
      answer: 'Go to Settings > Account > Change Password, or use the "Forgot Password" option on the login screen.',
    },
    {
      question: 'Can I download lessons for offline use?',
      answer: 'Yes! You can download lessons by tapping the download icon on any lesson card. Downloaded lessons are available in the "Downloads" section.',
    },
    {
      question: 'How do I cancel my subscription?',
      answer: 'You can cancel your subscription from the Settings > Subscription page. Your access will continue until the end of your current billing period.',
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

        <Heading size="xl" className="mb-2">Help Center</Heading>
        <BodyText variant="subtle" className="mb-6">
          Find answers to common questions and get support
        </BodyText>

        {/* Quick Help Topics */}
        <Subheading size="lg" className="mb-3">Quick Help</Subheading>
        <Card variant="bordered" padding="none" className="mb-6 bg-white dark:bg-neutral-900">
          {helpTopics.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              className="flex-row items-center p-4 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0"
              onPress={() => router.push(topic.route)}
            >
              <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${isDark ? 'bg-primary-900/30' : 'bg-primary-50'}`}>
                <MaterialIcons name={topic.icon as any} size={24} color="#4f46e5" />
              </View>
              <View className="flex-1">
                <BodyText className="font-semibold mb-1">{topic.title}</BodyText>
                <BodyText variant="subtle" size="sm">{topic.description}</BodyText>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={isDark ? '#52525b' : '#a1a1aa'} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* FAQ Section */}
        <Subheading size="lg" className="mb-3">Frequently Asked Questions</Subheading>
        <Card variant="bordered" padding="none" className="mb-6 bg-white dark:bg-neutral-900">
          {FAQData.map((faq, index) => (
            <View key={index} className="p-4 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
              <BodyText className="font-semibold mb-2">{faq.question}</BodyText>
              <BodyText variant="subtle" size="sm">{faq.answer}</BodyText>
            </View>
          ))}
        </Card>

        {/* Contact Support */}
        <Subheading size="lg" className="mb-3">Contact Us</Subheading>
        <Card variant="bordered" padding="none" className="bg-white dark:bg-neutral-900">
          {contactOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              className="flex-row items-center p-4 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0"
              onPress={option.action}
            >
              <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <MaterialIcons name={option.icon as any} size={24} color="#22c55e" />
              </View>
              <View className="flex-1">
                <BodyText className="font-semibold mb-1">{option.title}</BodyText>
                <BodyText variant="subtle" size="sm">{option.description}</BodyText>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={isDark ? '#52525b' : '#a1a1aa'} />
            </TouchableOpacity>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}
