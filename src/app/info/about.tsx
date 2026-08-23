import React from 'react';
import { View, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Heading, BodyText, Subheading } from '@/components/Typography';
import { Card } from '@/components';
import { useRouter } from 'expo-router';

export default function AboutScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const openSocial = (url: string) => {
    Linking.openURL(url);
  };

  const features = [
    {
      icon: 'school',
      title: 'Comprehensive Curriculum',
      description: 'Access thousands of practice questions across JAMB, WAEC, and other examinations.',
    },
    {
      icon: 'trending-up',
      title: 'Track Your Progress',
      description: 'Monitor your performance with detailed analytics and personalized insights.',
    },
    {
      icon: 'offline-bolt',
      title: 'Offline Learning',
      description: 'Download lessons and practice questions to study without internet access.',
    },
    {
      icon: 'groups',
      title: 'Expert Support',
      description: 'Get help from experienced tutors and connect with fellow students.',
    },
  ];

  const stats = [
    { label: 'Students', value: '10K+' },
    { label: 'Questions', value: '50K+' },
    { label: 'Subjects', value: '20+' },
    { label: 'Success Rate', value: '95%' },
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

        {/* Logo and Title */}
        <View className="items-center mb-6">
          <View className={`w-20 h-20 rounded-2xl items-center justify-center mb-4 ${isDark ? 'bg-primary-900/30' : 'bg-primary-50'}`}>
            <MaterialIcons name="school" size={40} color="#4f46e5" />
          </View>
          <Heading size="xl" className="mb-2">Future Academy</Heading>
          <BodyText variant="subtle">Version 1.0.0</BodyText>
        </View>

        {/* Mission Statement */}
        <Card variant="bordered" padding="lg" className="bg-white dark:bg-neutral-900 mb-6">
          <Subheading size="lg" className="mb-2 text-center">Our Mission</Subheading>
          <BodyText variant="subtle" className="text-center">
            To empower students across Nigeria with accessible, high-quality educational resources that help them achieve academic excellence and reach their full potential.
          </BodyText>
        </Card>

        {/* Stats */}
        <Card variant="bordered" padding="none" className="bg-white dark:bg-neutral-900 mb-6">
          <View className="flex-row flex-wrap">
            {stats.map((stat, index) => (
              <View key={index} className="flex-1 min-w-[100px] items-center p-4 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
                <Heading size="lg" className="text-primary-600 dark:text-primary-400">{stat.value}</Heading>
                <BodyText variant="subtle" size="sm">{stat.label}</BodyText>
              </View>
            ))}
          </View>
        </Card>

        {/* Features */}
        <Subheading size="lg" className="mb-3">Why Choose Us</Subheading>
        <Card variant="bordered" padding="none" className="bg-white dark:bg-neutral-900 mb-6">
          {features.map((feature, index) => (
            <View key={index} className="flex-row items-start p-4 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
              <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isDark ? 'bg-primary-900/30' : 'bg-primary-50'}`}>
                <MaterialIcons name={feature.icon as any} size={20} color="#4f46e5" />
              </View>
              <View className="flex-1">
                <BodyText className="font-semibold mb-1">{feature.title}</BodyText>
                <BodyText variant="subtle" size="sm">{feature.description}</BodyText>
              </View>
            </View>
          ))}
        </Card>

        {/* Contact Info */}
        <Subheading size="lg" className="mb-3">Contact Us</Subheading>
        <Card variant="bordered" padding="none" className="bg-white dark:bg-neutral-900 mb-6">
          <TouchableOpacity
            className="flex-row items-center p-4 border-b border-neutral-200 dark:border-neutral-800"
            onPress={() => Linking.openURL('https://futureacademy.edu')}
          >
            <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <MaterialIcons name="language" size={20} color="#2563eb" />
            </View>
            <View className="flex-1">
              <BodyText className="font-semibold">Website</BodyText>
              <BodyText variant="subtle" size="sm">futureacademy.edu</BodyText>
            </View>
            <MaterialIcons name="open-in-new" size={20} color={isDark ? '#52525b' : '#a1a1aa'} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center p-4 border-b border-neutral-200 dark:border-neutral-800"
            onPress={() => Linking.openURL('mailto:info@futureacademy.edu')}
          >
            <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}>
              <MaterialIcons name="email" size={20} color="#22c55e" />
            </View>
            <View className="flex-1">
              <BodyText className="font-semibold">Email</BodyText>
              <BodyText variant="subtle" size="sm">info@futureacademy.edu</BodyText>
            </View>
            <MaterialIcons name="open-in-new" size={20} color={isDark ? '#52525b' : '#a1a1aa'} />
          </TouchableOpacity>

          <View className="flex-row items-center p-4">
            <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isDark ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
              <MaterialIcons name="location-on" size={20} color="#f59e0b" />
            </View>
            <View className="flex-1">
              <BodyText className="font-semibold">Location</BodyText>
              <BodyText variant="subtle" size="sm">Nigeria</BodyText>
            </View>
          </View>
        </Card>

        {/* Social Media */}
        <Subheading size="lg" className="mb-3">Follow Us</Subheading>
        <Card variant="bordered" padding="none" className="bg-white dark:bg-neutral-900 mb-6">
          <View className="flex-row justify-around p-4">
            <TouchableOpacity onPress={() => openSocial('https://twitter.com/futureacademy')}>
              <View className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <MaterialIcons name="alternate-email" size={24} color="#1DA1F2" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openSocial('https://facebook.com/futureacademy')}>
              <View className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <MaterialIcons name="facebook" size={24} color="#4267B2" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openSocial('https://instagram.com/futureacademy')}>
              <View className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? 'bg-pink-900/30' : 'bg-pink-50'}`}>
                <MaterialIcons name="camera-alt" size={24} color="#E4405F" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openSocial('https://linkedin.com/company/futureacademy')}>
              <View className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <MaterialIcons name="work" size={24} color="#0077B5" />
              </View>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Legal Links */}
        <Card variant="bordered" padding="none" className="bg-white dark:bg-neutral-900">
          <TouchableOpacity
            className="flex-row items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800"
            onPress={() => {}}
          >
            <BodyText>Terms of Service</BodyText>
            <MaterialIcons name="chevron-right" size={24} color={isDark ? '#52525b' : '#a1a1aa'} />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center justify-between p-4"
            onPress={() => {}}
          >
            <BodyText>Privacy Policy</BodyText>
            <MaterialIcons name="chevron-right" size={24} color={isDark ? '#52525b' : '#a1a1aa'} />
          </TouchableOpacity>
        </Card>

        <BodyText variant="subtle" size="sm" className="text-center mt-6 mb-4">
          © 2026 Future Academy. All rights reserved.
        </BodyText>
      </ScrollView>
    </View>
  );
}
