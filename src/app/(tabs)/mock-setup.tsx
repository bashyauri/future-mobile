import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card, Button } from '@/components';
import { Heading, Subheading, BodyText, Caption } from '@/components/Typography';
import api from '@/lib/api';

// Types based on API responses
type ExamType = {
  id: number;
  name: string;
  exam_format?: string;
};

type Subject = {
  id: number;
  name: string;
};

type Year = {
  year: number | string;
  label: string;
};

type MockFormatSpec = {
  overall?: { time_limit?: number; sum_subject_time?: boolean };
  per_subject?: Array<{
    match: string[];
    questions: number;
    time?: number;
  }>;
  default?: { questions: number; time?: number };
};

export default function MockSetupScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Loading flags
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API data
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [mockFormats, setMockFormats] = useState<Record<string, MockFormatSpec>>({});

  // Selections
  const [selectedExamType, setSelectedExamType] = useState<ExamType | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);
  const [shuffle, setShuffle] = useState(false);

  // Configuration derived from mock formats
  const maxSubjects = 4;

  // Fetch all configuration on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [examRes, subjectsRes, yearsRes, formatsRes] = await Promise.all([
          api.get('/config/exam-types'),
          api.get('/config/subjects'),
          api.get('/config/years'),
          api.get('/config/mock-formats'),
        ]);
        setExamTypes(examRes.data?.data ?? []);
        setSubjects(subjectsRes.data?.data ?? []);
        // include a "Random" year option like the web version
        setYears([{ year: 'random', label: 'Random' }, ...(yearsRes.data?.data ?? [])]);
        setMockFormats(formatsRes.data?.data ?? {});
        // Default selections
        if (examRes.data?.data?.length) setSelectedExamType(examRes.data.data[0]);
        if (subjectsRes.data?.data?.length) setSelectedSubjects([subjectsRes.data.data[0]]);
        setSelectedYear({ year: 'random', label: 'Random' });
      } catch (e) {
        console.warn(e);
        setError('Failed to load configuration. Please check your network connection.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const toggleSubject = (subject: Subject) => {
    const already = selectedSubjects.find((s) => s.id === subject.id);
    if (already) {
      setSelectedSubjects(selectedSubjects.filter((s) => s.id !== subject.id));
    } else if (selectedSubjects.length < maxSubjects) {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const startMock = async () => {
    if (!selectedExamType) return;
    try {
      const payload = {
        exam_type_id: selectedExamType.id,
        subject_ids: selectedSubjects.map((s) => s.id),
        year: selectedYear?.year ?? null,
        shuffle,
      };
      const res = await api.post('/mock/sessions', payload);
      // Assuming the API returns a session ID and a route to start the exam
      const sessionId = res.data?.data?.id;
      // Navigate to mock exam screen – placeholder navigation logic
      // Replace with your app's navigation method
      // e.g., router.push(`/mock/${sessionId}`);
      console.log('Mock session created', sessionId);
    } catch (e) {
      console.warn(e);
      setError('Failed to start mock exam. Please try again later.');
    }
  };

  // UI Rendering
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
        <BodyText className="mt-4 text-neutral-900 dark:text-neutral-400">Loading options...</BodyText>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-8">
        <MaterialIcons name="cloud-off" size={48} color="#a1a1aa" />
        <BodyText className="mt-4 text-center text-neutral-900 dark:text-neutral-400">{error}</BodyText>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View className="pt-16 pb-6 px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <Heading size="xl" className="mb-2">Mock Exam Setup</Heading>
        <BodyText className="text-neutral-900 dark:text-neutral-400">
          Choose exam type, year and up to {maxSubjects} subjects for a full mock experience.
        </BodyText>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        <View className="flex-1">
        {/* Exam Type Selection */}
                <Subheading size="md" className="mb-3 px-2">Select Exam Type</Subheading>
        <View className="flex flex-wrap gap-2 mb-8 pl-2">
          {examTypes.map((et) => (
            <Button
              key={et.id}
              variant={selectedExamType?.id === et.id ? 'primary' : 'secondary'}
              onPress={() => setSelectedExamType(et)}
              className="mr-3"
            >
              {et.name}
            </Button>
          ))}
        </View>

        {/* Year Selection */}
        <Subheading size="md" className="mb-3 px-2">Select Year</Subheading>
        <View className="flex-row flex-wrap px-2 mb-6">
          {years.map((y) => (
            <Button
              key={String(y.year)}
              variant={selectedYear?.year === y.year ? 'primary' : 'secondary'}
              onPress={() => setSelectedYear(y)}
              className="mr-3 mb-3"
            >
              {y.label ?? y.year}
            </Button>
          ))}
        </View>

        {/* Subject Selection */}
        <Subheading size="md" className="mb-3 px-2">Select Subjects (max {maxSubjects})</Subheading>
        <View className="flex-row flex-wrap px-2 mb-6">
          {subjects.map((sub) => {
            const selected = selectedSubjects.find((s) => s.id === sub.id);
            const canSelect = selectedSubjects.length < maxSubjects || !!selected;
            return (
              <Button
                key={sub.id}
                variant={selected ? 'primary' : 'secondary'}
                onPress={() => toggleSubject(sub)}
                disabled={!canSelect && !selected}
                className="mr-3 mb-3"
              >
                {sub.name}
              </Button>
            );
          })}
        </View>

        {/* Options */}
        <Subheading size="md" className="mb-3 px-2">Options</Subheading>
        <Card variant="bordered" padding="md" className="mb-24 bg-white dark:bg-neutral-900">
          <View className="flex-row items-center justify-between mb-4">
            <BodyText className="font-medium">Shuffle Questions</BodyText>
            <Switch
              value={shuffle}
              onValueChange={setShuffle}
              trackColor={{ false: isDark ? '#3f3f46' : '#e4e4e7', true: '#4f46e5' }}
            />
          </View>
        </Card>
      </View>
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-lg border-t border-neutral-200 dark:border-neutral-800">
        <Button
          title="Start Mock Exam"
          onPress={startMock}
          disabled={!selectedExamType || selectedSubjects.length === 0}
          size="lg"
          variant="primary"
          className="w-full"
        />
      </View>
    </View>
  );
}
