import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Heading, BodyText, Subheading } from '@/components/Typography';
import { Card } from '@/components';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const sections = [
    {
      title: 'Information We Collect',
      content: 'We collect information you provide directly to us, such as when you create an account, subscribe to our services, or communicate with us. This includes your name, email address, payment information, and any other information you choose to provide.',
    },
    {
      title: 'How We Use Your Information',
      content: 'We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, respond to your comments and questions, and provide customer service.',
    },
    {
      title: 'Information Sharing',
      content: 'We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy or as required by law. We may share your information with service providers who perform services on our behalf.',
    },
    {
      title: 'Data Security',
      content: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.',
    },
    {
      title: 'Your Rights',
      content: 'You have the right to access, correct, or delete your personal information. You can also opt out of marketing communications at any time. To exercise these rights, please contact us at privacy@futureacademy.edu.',
    },
    {
      title: 'Children\'s Privacy',
      content: 'Our services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.',
    },
    {
      title: 'Changes to This Policy',
      content: 'We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.',
    },
    {
      title: 'Contact Us',
      content: 'If you have any questions about this Privacy Policy, please contact us at privacy@futureacademy.edu or +234 XXX XXX XXXX.',
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

        <Heading size="xl" className="mb-2">Privacy Policy</Heading>
        <BodyText variant="subtle" className="mb-6">
          Last Updated: August 2026
        </BodyText>

        <Card variant="bordered" padding="lg" className="bg-white dark:bg-neutral-900 mb-6">
          <BodyText className="mb-4">
            Future Academy ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application and services.
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
