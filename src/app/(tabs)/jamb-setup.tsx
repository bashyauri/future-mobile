import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card, Button } from '@/components';
import { Heading, Subheading, BodyText, Caption } from '@/components/Typography';
import api from '@/lib/api';

type Subject = {
  id: number;
  name: string;
  is_compulsory?: boolean;
};

const getSubjectIcon = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('english')) return 'book-open-variant';
  if (n.includes('math')) return 'calculator';
  if (n.includes('physics')) return 'atom';
  if (n.includes('chemistry')) return 'flask';
  if (n.includes('biology')) return 'leaf';
  if (n.includes('economics')) return 'chart-line';
  if (n.includes('commerce')) return 'store';
  if (n.includes('government')) return 'bank';
  if (n.includes('literature')) return 'book-open-page-variant';
  if (n.includes('geography')) return 'earth';
  if (n.includes('account')) return 'cash';
  if (n.includes('agric')) return 'sprout';
  return 'school';
};

const getSubjectColor = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('english')) return '#3b82f6';
  if (n.includes('math')) return '#ef4444';
  if (n.includes('physics')) return '#8b5cf6';
  if (n.includes('chemistry')) return '#10b981';
  if (n.includes('biology')) return '#14b8a6';
  if (n.includes('economics')) return '#f59e0b';
  if (n.includes('commerce')) return '#f97316';
  if (n.includes('government')) return '#6366f1';
  if (n.includes('literature')) return '#ec4899';
  if (n.includes('geography')) return '#22c55e';
  return '#a855f7';
};

export default function JambSetupScreen() {
  const { theme } = useTheme();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await api.get('/config/subjects');
        const fetched: Subject[] = res.data?.data ?? res.data ?? [];
        setSubjects(fetched);

        // Auto-select compulsory subjects (Use of English)
        const compulsory = fetched
          .filter((s) => s.is_compulsory || s.name.toLowerCase().includes('english'))
          .map((s) => s.id);
        setSelectedIds(compulsory);
      } catch (e) {
        setError('Could not load subjects. Please check your connection.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  const isRequired = (subject: Subject): boolean =>
    !!(subject.is_compulsory || subject.name.toLowerCase().includes('english'));

  const toggleSubject = (subject: Subject) => {
    if (isRequired(subject)) return;

    if (selectedIds.includes(subject.id)) {
      setSelectedIds(selectedIds.filter((id) => id !== subject.id));
    } else {
      if (selectedIds.length < 4) {
        setSelectedIds([...selectedIds, subject.id]);
      }
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
        <BodyText className="mt-4 text-neutral-500">Loading subjects...</BodyText>
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
        <Heading size="xl" className="mb-2">JAMB Exam</Heading>
        <BodyText className="text-neutral-500 dark:text-neutral-400">
          Select exactly 4 subjects to begin your standard JAMB mock examination.
        </BodyText>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        <View className="flex-row justify-between items-end mb-4 px-2">
          <Subheading size="md">Available Subjects</Subheading>
          <Caption className={selectedIds.length === 4 ? 'text-success-500 font-bold' : 'text-neutral-500'}>
            {selectedIds.length}/4 Selected
          </Caption>
        </View>

        <View className="flex-row flex-wrap justify-between pb-24">
          {subjects.map((subject) => {
            const isSelected = selectedIds.includes(subject.id);
            const required = isRequired(subject);
            const color = getSubjectColor(subject.name);
            const icon = getSubjectIcon(subject.name);

            return (
              <TouchableOpacity
                key={subject.id}
                activeOpacity={0.7}
                onPress={() => toggleSubject(subject)}
                className="w-[48%] mb-4"
              >
                <Card
                  variant="bordered"
                  padding="md"
                  className={`border-2 ${isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-transparent bg-white dark:bg-neutral-900'}`}
                >
                  <View className="flex-row justify-between items-start mb-3">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
                    </View>

                    {required ? (
                      <View className="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                        <Caption className="text-neutral-600 dark:text-neutral-400 text-[10px] font-bold">REQ</Caption>
                      </View>
                    ) : (
                      <View
                        className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                          isSelected ? 'bg-primary-500 border-primary-500' : 'border-neutral-300 dark:border-neutral-600'
                        }`}
                      >
                        {isSelected && <MaterialIcons name="check" size={14} color="white" />}
                      </View>
                    )}
                  </View>
                  <BodyText className={`font-semibold ${isSelected ? 'text-primary-900 dark:text-primary-100' : ''}`}>
                    {subject.name}
                  </BodyText>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-lg border-t border-neutral-200 dark:border-neutral-800">
        <Button
          title={selectedIds.length === 4 ? 'Start JAMB Exam' : `Select ${4 - selectedIds.length} more`}
          disabled={selectedIds.length !== 4}
          onPress={() => {}}
          size="lg"
          icon="play-arrow"
        />
      </View>
    </View>
  );
}
