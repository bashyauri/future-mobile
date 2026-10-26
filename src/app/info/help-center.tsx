import React, { useState } from 'react';
import { View, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Heading, BodyText, Subheading } from '@/components/Typography';
import { Card } from '@/components';
import { useRouter } from 'expo-router';

type HelpTopic = {
  id: number;
  icon: string;
  title: string;
  description: string;
  details: string[];
  actionLabel?: string;
  actionRoute?: string;
};

export default function HelpCenterScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [expandedTopicId, setExpandedTopicId] = useState<number | null>(null);

  const helpTopics: HelpTopic[] = [
    {
      id: 1,
      icon: 'school',
      title: 'Getting Started',
      description: 'Learn how to set up your account and start learning',
      details: [
        'Complete your profile setup to tailor exams to your grade level.',
        'Choose your primary exam goal (JAMB, WAEC, or Subject Practice).',
        'Access interactive practice quizzes and video lessons directly from your Dashboard.',
      ],
      actionLabel: 'Go to Dashboard',
      actionRoute: '/(tabs)',
    },
    {
      id: 2,
      icon: 'quiz',
      title: 'Practice & Quizzes',
      description: 'How to take practice exams and review solutions',
      details: [
        'Practice Mode: Pick specific subjects, topics, and past exam years.',
        'JAMB Exam Mode: Simulate real exam conditions with timed 4-subject sets.',
        'Comprehensive Review: Review step-by-step explanations for each question.',
      ],
      actionLabel: 'Start Practice',
      actionRoute: '/(tabs)/practice-setup',
    },
    {
      id: 3,
      icon: 'payment',
      title: 'Subscription & Billing',
      description: 'Manage your subscription and unlock full content access',
      details: [
        'Take advantage of your free trial to test out quiz and lesson features.',
        'Subscribe to monthly or yearly plans to access the complete question archive.',
        'Instant activation upon verified payment with secure channels.',
      ],
      actionLabel: 'View Pricing & Plans',
      actionRoute: '/pricing',
    },
    {
      id: 4,
      icon: 'account-circle',
      title: 'Account Settings',
      description: 'Update your profile, theme, and security preferences',
      details: [
        'Switch between Dark Mode and Light Mode according to your preference.',
        'Manage account security and update your profile details.',
        'Access terms, privacy policies, and support directly from Settings.',
      ],
      actionLabel: 'Go to Settings',
      actionRoute: '/(tabs)/settings',
    },
  ];

  const contactOptions = [
    {
      id: 1,
      icon: 'chat',
      title: 'Company WhatsApp',
      description: '07071100037 (Direct Chat)',
      action: () => Linking.openURL('https://wa.me/2347071100037?text=Hello%20Future%20Academy%2C%20I%20need%20assistance'),
    },
    {
      id: 2,
      icon: 'email',
      title: 'Support & Inquiries',
      description: 'futureacademy-rm@gmail.com',
      action: () => Linking.openURL('mailto:futureacademy-rm@gmail.com'),
    },
    {
      id: 3,
      icon: 'mark-email-read',
      title: 'Official / System Email',
      description: 'noreply@futureacademy-rm.com',
      action: () => Linking.openURL('mailto:noreply@futureacademy-rm.com'),
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

  const toggleTopic = (id: number) => {
    setExpandedTopicId((current) => (current === id ? null : id));
  };

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
          {helpTopics.map((topic) => {
            const isExpanded = expandedTopicId === topic.id;

            return (
              <View
                key={topic.id}
                className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0"
              >
                <TouchableOpacity
                  className="flex-row items-center p-4"
                  onPress={() => toggleTopic(topic.id)}
                  activeOpacity={0.7}
                >
                  <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${isDark ? 'bg-primary-900/30' : 'bg-primary-50'}`}>
                    <MaterialIcons name={topic.icon as any} size={24} color="#4f46e5" />
                  </View>
                  <View className="flex-1">
                    <BodyText className="font-semibold mb-1">{topic.title}</BodyText>
                    <BodyText variant="subtle" size="sm">{topic.description}</BodyText>
                  </View>
                  <MaterialIcons
                    name={isExpanded ? 'expand-less' : 'expand-more'}
                    size={24}
                    color={isDark ? '#a1a1aa' : '#71717a'}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View className="px-4 pb-4 pt-1 bg-neutral-50/70 dark:bg-neutral-800/40">
                    <View className="gap-2 mb-3">
                      {topic.details.map((point, idx) => (
                        <View key={idx} className="flex-row items-start">
                          <MaterialIcons
                            name="check-circle"
                            size={16}
                            color="#4f46e5"
                            style={{ marginTop: 2, marginRight: 8 }}
                          />
                          <BodyText size="sm" className="flex-1 text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            {point}
                          </BodyText>
                        </View>
                      ))}
                    </View>

                    {topic.actionRoute && topic.actionLabel && (
                      <TouchableOpacity
                        onPress={() => router.push(topic.actionRoute as any)}
                        className="mt-1 flex-row items-center justify-center bg-primary-600 dark:bg-primary-500 py-2.5 px-4 rounded-xl"
                        activeOpacity={0.8}
                      >
                        <BodyText className="text-white font-semibold text-sm mr-1">
                          {topic.actionLabel}
                        </BodyText>
                        <MaterialIcons name="arrow-forward" size={16} color="#ffffff" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}
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

        {/* Corporate Registration & CAC */}
        <Card variant="bordered" padding="md" className="mt-6 mb-8 bg-white dark:bg-neutral-900 border-emerald-500/30">
          <View className="flex-row items-center mb-1.5">
            <View className={`w-7 h-7 rounded-full items-center justify-center mr-2 ${isDark ? 'bg-emerald-950/60' : 'bg-emerald-100'}`}>
              <MaterialIcons name="verified" size={16} color="#10b981" />
            </View>
            <BodyText className="font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Company Registered &bull; RC: 1919844
            </BodyText>
          </View>
          <BodyText variant="subtle" size="sm" className="leading-relaxed">
            Future Academy is a project of <BodyText className="font-semibold text-neutral-900 dark:text-white">RMS GL (Ramenshuka Global Resources)</BodyText>, registered under the Corporate Affairs Commission (CAC) of the Federal Republic of Nigeria.
          </BodyText>
        </Card>
      </ScrollView>
    </View>
  );
}
