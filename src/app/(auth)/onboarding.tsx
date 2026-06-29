import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, Alert, SafeAreaView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button, Card } from '@/components';
import { Heading, BodyText, Subheading } from '@/components/Typography';
import api from '@/lib/api';

type Subject = {
  id: number;
  name: string;
  code: string;
  icon?: string;
};

const STREAMS = [
  { id: 'science', name: 'Science', description: 'Physics, Chemistry, Biology, Math', subjects: ['Mathematics', 'English Language', 'Physics', 'Chemistry'] },
  { id: 'arts', name: 'Arts', description: 'Literature, Government, History', subjects: ['Mathematics', 'English Language', 'Literature in English', 'Government'] },
  { id: 'commercial', name: 'Commercial', description: 'Accounting, Commerce, Economics', subjects: ['Mathematics', 'English Language', 'Economics', 'Commerce'] },
];

export default function OnboardingScreen() {
  const { user, updateUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [loading, setLoading] = useState(false);
  const [fetchingSubjects, setFetchingSubjects] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [mode, setMode] = useState<'stream' | 'manual'>('stream');
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const response = await api.get('/config/subjects');
        // Handle varying response structures (e.g., { data: [...] } vs [...])
        const subjectsData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        setSubjects(subjectsData);
      } catch (error) {
        console.log('Error fetching subjects:', error);
      } finally {
        setFetchingSubjects(false);
      }
    };
    loadSubjects();
  }, []);

  const toggleSubject = (subjectId: number) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      }
      if (prev.length >= 4) {
        Alert.alert('Limit Reached', 'You can only select up to 4 subjects.');
        return prev;
      }
      return [...prev, subjectId];
    });
  };

  const handleComplete = async () => {
    if (mode === 'stream' && !selectedStream) {
      Alert.alert('Selection Required', 'Please select a stream to continue');
      return;
    }
    if (mode === 'manual' && selectedSubjects.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one subject');
      return;
    }

    setLoading(true);
    try {
      // Simulate saving to API
      // await api.post('/user/onboarding', { stream: selectedStream, subjects: selectedSubjects });

      if (user) {
        updateUser({ ...user, has_completed_onboarding: true });
      }
    } catch (error) {
      console.log('Onboarding error:', error);
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSubjectIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('math')) return 'calculate';
    if (lowerName.includes('english')) return 'menu-book';
    if (lowerName.includes('physics')) return 'science';
    if (lowerName.includes('chemistry')) return 'science';
    if (lowerName.includes('biology')) return 'biotech';
    if (lowerName.includes('econ')) return 'trending-up';
    if (lowerName.includes('gov')) return 'account-balance';
    return 'library-books';
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-neutral-950' : 'bg-white'}`}>
      <View className="px-6 pt-10 pb-4">
        <View className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 items-center justify-center mb-4">
          <MaterialIcons name="auto-awesome" size={28} color="#4f46e5" />
        </View>
        <Heading size="xl">Personalize Your Setup</Heading>
        <BodyText variant="subtle" className="mt-2">Choose how you want to prepare. You can pick a curated stream or manually select your subjects.</BodyText>
        
        {/* Toggle Mode */}
        <View className="flex-row mt-6 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl">
          <TouchableOpacity 
            className={`flex-1 py-2 items-center justify-center rounded-lg ${mode === 'stream' ? 'bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200 dark:border-neutral-700' : ''}`}
            onPress={() => setMode('stream')}
          >
            <BodyText className={`font-semibold ${mode === 'stream' ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500'}`}>Pick a Stream</BodyText>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-2 items-center justify-center rounded-lg ${mode === 'manual' ? 'bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200 dark:border-neutral-700' : ''}`}
            onPress={() => setMode('manual')}
          >
            <BodyText className={`font-semibold ${mode === 'manual' ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500'}`}>Select Manual</BodyText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {mode === 'stream' ? (
          <View className="space-y-4 pt-2 pb-8">
            {STREAMS.map((stream) => (
              <Card
                key={stream.id}
                variant={selectedStream === stream.id ? 'bordered' : 'elevated'}
                padding="md"
                onPress={() => setSelectedStream(stream.id)}
                className={selectedStream === stream.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : ''}
              >
                <View className="flex-row items-center mb-3">
                  <View className="flex-1">
                    <Subheading size="lg" className={selectedStream === stream.id ? 'text-primary-700 dark:text-primary-400' : ''}>{stream.name}</Subheading>
                    <BodyText variant="subtle" size="sm" className="mt-1">{stream.description}</BodyText>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedStream === stream.id ? 'bg-primary-600 border-primary-600' : 'border-neutral-300 dark:border-neutral-600'}`}>
                    {selectedStream === stream.id && <MaterialIcons name="check" size={14} color="white" />}
                  </View>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {stream.subjects.map(sub => (
                    <View key={sub} className="bg-white dark:bg-neutral-800 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700">
                      <BodyText size="xs" className="text-neutral-600 dark:text-neutral-300">{sub}</BodyText>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <View className="pt-2 pb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Subheading>Available Subjects</Subheading>
              <BodyText variant="subtle" size="sm">{selectedSubjects.length}/4 Selected</BodyText>
            </View>
            
            {fetchingSubjects ? (
              <View className="py-10 items-center justify-center">
                <ActivityIndicator size="large" color="#4f46e5" />
                <BodyText className="mt-4 text-neutral-500">Loading subjects...</BodyText>
              </View>
            ) : subjects.length > 0 ? (
              <View className="flex-row flex-wrap justify-between gap-y-3">
                {subjects.map((subject) => {
                  const isSelected = selectedSubjects.includes(subject.id);
                  return (
                    <TouchableOpacity
                      key={subject.id}
                      onPress={() => toggleSubject(subject.id)}
                      className={`w-[48%] p-3 rounded-xl border ${
                        isSelected 
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                      }`}
                    >
                      <View className="flex-row justify-between items-start mb-2">
                        <View className={`w-8 h-8 rounded-full items-center justify-center ${isSelected ? 'bg-primary-600' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                          <MaterialIcons name={getSubjectIcon(subject.name)} size={16} color={isSelected ? 'white' : (isDark ? '#a1a1aa' : '#71717a')} />
                        </View>
                        {isSelected && <MaterialIcons name="check-circle" size={20} color="#4f46e5" />}
                      </View>
                      <BodyText size="sm" className="font-semibold" numberOfLines={1}>{subject.name}</BodyText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View className="py-10 items-center justify-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <MaterialIcons name="error-outline" size={40} color="#a1a1aa" />
                <BodyText className="mt-4 text-neutral-500 text-center px-6">Could not load subjects. Please check your connection.</BodyText>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View className="px-6 py-4 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-900">
        <Button 
          variant="primary" 
          size="lg" 
          fullWidth 
          onPress={handleComplete}
          disabled={loading || (mode === 'manual' && selectedSubjects.length === 0) || (mode === 'stream' && !selectedStream)}
          loading={loading}
        >
          {mode === 'manual' ? `Continue with ${selectedSubjects.length} Subject${selectedSubjects.length !== 1 ? 's' : ''}` : 'Continue Setup'}
        </Button>
      </View>
    </SafeAreaView>
  );
}
