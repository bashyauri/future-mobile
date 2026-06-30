import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card, Button } from '@/components';
import { Heading, Subheading, BodyText, Caption } from '@/components/Typography';
import api from '@/lib/api';

type Subject = {
  id: number;
  name: string;
};

type Year = {
  year: number | string;
  label: string;
};

export default function PracticeSetupScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);
  const [isTimed, setIsTimed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [subjectsRes, yearsRes] = await Promise.all([
          api.get('/config/subjects'),
          api.get('/config/years'),
        ]);

        const fetchedSubjects: Subject[] = subjectsRes.data?.data ?? subjectsRes.data ?? [];
        const fetchedYears: Year[] = yearsRes.data?.data ?? yearsRes.data ?? [];

        setSubjects(fetchedSubjects);
        setYears([{ year: 'random', label: 'Random' }, ...fetchedYears]);

        if (fetchedSubjects.length > 0) {
          setSelectedSubject(fetchedSubjects[0]);
        }
        setSelectedYear({ year: 'random', label: 'Random' });
      } catch (e) {
        setError('Could not load configuration. Please check your connection.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
        <BodyText className="mt-4 text-neutral-500">Loading options...</BodyText>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-8">
        <MaterialIcons name="cloud-off" size={48} color="#a1a1aa" />
        <BodyText className="mt-4 text-center text-neutral-500">{error}</BodyText>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View className="pt-16 pb-6 px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <Heading size="xl" className="mb-2">Practice Mode</Heading>
        <BodyText className="text-neutral-900 dark:text-neutral-400">
          Focus on specific subjects and past questions to sharpen your skills at your own pace.
        </BodyText>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* Subject Selection */}
        <Subheading size="md" className="mb-3 px-2">Select Subject</Subheading>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 pl-2">
          {subjects.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              activeOpacity={0.7}
              onPress={() => setSelectedSubject(subject)}
              className={`mr-3 px-5 py-3 rounded-full border-2 ${
                selectedSubject?.id === subject.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
              }`}
            >
              <BodyText className={`font-medium ${selectedSubject?.id === subject.id ? 'text-primary-600 dark:text-primary-400' : ''}`}>
                {subject.name}
              </BodyText>
            </TouchableOpacity>
          ))}
          <View className="w-4" />
        </ScrollView>

        {/* Year Selection */}
        <Subheading size="md" className="mb-3 px-2">Select Year</Subheading>
        <View className="flex-row flex-wrap px-2 mb-6">
          {years.map((y) => (
            <TouchableOpacity
              key={String(y.year)}
              activeOpacity={0.7}
              onPress={() => setSelectedYear(y)}
              className={`mr-3 mb-3 px-4 py-2 rounded-xl border-2 ${
                selectedYear?.year === y.year
                  ? 'border-secondary-500 bg-secondary-50 dark:bg-secondary-900/30'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
              }`}
            >
              <BodyText className={`font-medium ${selectedYear?.year === y.year ? 'text-secondary-600 dark:text-secondary-400' : ''}`}>
                {y.label ?? String(y.year)}
              </BodyText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Practice Options */}
        <Subheading size="md" className="mb-3 px-2">Options</Subheading>
        <Card variant="bordered" padding="md" className="mb-24 bg-white dark:bg-neutral-900">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-4">
              <View className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center mr-3">
                <MaterialIcons name="timer" size={20} color={isDark ? '#a1a1aa' : '#52525b'} />
              </View>
              <View>
                <BodyText className="font-semibold mb-1">Timed Mode</BodyText>
                <Caption className="text-neutral-900">Practice under exam pressure</Caption>
              </View>
            </View>
            <Switch
              value={isTimed}
              onValueChange={setIsTimed}
              trackColor={{ false: isDark ? '#3f3f46' : '#e4e4e7', true: '#4f46e5' }}
            />
          </View>
        </Card>
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-lg border-t border-neutral-200 dark:border-neutral-800">
        <Button
          title="Start Practice Session"
          onPress={() => {}}
          size="lg"
          icon="play-arrow"
          disabled={!selectedSubject}
        />
      </View>
    </View>
  );
}
