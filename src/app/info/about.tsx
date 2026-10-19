import React from 'react';
import { View, TouchableOpacity, Linking, ScrollView, Image } from 'react-native';
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
      icon: 'psychology',
      title: 'AI-Powered Insights',
      description: 'Get personalized feedback and recommendations based on your performance.',
    },
    {
      icon: 'trending-up',
      title: 'Track Your Growth',
      description: 'Detailed analytics and progress tracking to identify strengths and areas for improvement.',
    },
    {
      icon: 'workspace-premium',
      title: 'Expert-Crafted Content',
      description: 'Questions and explanations prepared by experienced educators.',
    },
  ];

  const stats = [
    { label: 'Practice Questions', value: '10,000+' },
    { label: 'Active Students', value: '5,000+' },
    { label: 'Success Rate', value: '94%' },
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
          <Image
            source={require('../../../assets/images/icon.png')}
            style={{ width: 88, height: 88, borderRadius: 20, marginBottom: 16 }}
            resizeMode="cover"
          />
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

        {/* Company Registration & CAC */}
        <Card variant="bordered" padding="md" className="bg-white dark:bg-neutral-900 mb-6 border-emerald-500/30">
          <View className="flex-row items-center mb-2">
            <View className={`w-8 h-8 rounded-full items-center justify-center mr-2.5 ${isDark ? 'bg-emerald-950/60' : 'bg-emerald-100'}`}>
              <MaterialIcons name="verified" size={18} color="#10b981" />
            </View>
            <View className="flex-1">
              <BodyText className="font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Company Registered
              </BodyText>
              <Heading size="sm">RC: 1919844</Heading>
            </View>
          </View>
          <BodyText variant="subtle" size="sm" className="leading-relaxed">
            Future Academy is a project of <BodyText className="font-semibold text-neutral-900 dark:text-white">RMS GL (Ramenshuka Global Resources)</BodyText>, registered under the Corporate Affairs Commission (CAC) of the Federal Republic of Nigeria.
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
            onPress={() => Linking.openURL('https://wa.me/2347071100037?text=Hello%20Future%20Academy%2C%20I%20would%20like%20to%20make%20an%20enquiry')}
          >
            <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
              <MaterialIcons name="chat" size={20} color="#10b981" />
            </View>
            <View className="flex-1">
              <BodyText className="font-semibold">Company WhatsApp</BodyText>
              <BodyText variant="subtle" size="sm">07071100037</BodyText>
            </View>
            <MaterialIcons name="open-in-new" size={20} color={isDark ? '#52525b' : '#a1a1aa'} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center p-4 border-b border-neutral-200 dark:border-neutral-800"
            onPress={() => Linking.openURL('mailto:futureacademy-rm@gmail.com')}
          >
            <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <MaterialIcons name="email" size={20} color="#2563eb" />
            </View>
            <View className="flex-1">
              <BodyText className="font-semibold">Direct Email & Support</BodyText>
              <BodyText variant="subtle" size="sm">futureacademy-rm@gmail.com</BodyText>
            </View>
            <MaterialIcons name="open-in-new" size={20} color={isDark ? '#52525b' : '#a1a1aa'} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center p-4 border-b border-neutral-200 dark:border-neutral-800"
            onPress={() => Linking.openURL('mailto:noreply@futureacademy-rm.com')}
          >
            <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isDark ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
              <MaterialIcons name="mark-email-read" size={20} color={isDark ? '#a1a1aa' : '#71717a'} />
            </View>
            <View className="flex-1">
              <BodyText className="font-semibold">Official Correspondence</BodyText>
              <BodyText variant="subtle" size="sm">noreply@futureacademy-rm.com</BodyText>
            </View>
            <MaterialIcons name="open-in-new" size={20} color={isDark ? '#52525b' : '#a1a1aa'} />
          </TouchableOpacity>

          <View className="flex-row items-center p-4">
            <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isDark ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
              <MaterialIcons name="location-on" size={20} color="#f59e0b" />
            </View>
            <View className="flex-1">
              <BodyText className="font-semibold">Location</BodyText>
              <BodyText variant="subtle" size="sm">Federal Republic of Nigeria</BodyText>
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
          © 2026 Future Academy &bull; A project of Ramenshuka Global Resources (RMS GL) &bull; RC: 1919844
        </BodyText>
      </ScrollView>
    </View>
  );
}
