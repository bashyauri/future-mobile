import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "expo-router";
import {
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button, Card } from "@/components";
import { Heading, BodyText, Subheading, Caption } from "@/components/Typography";
import api from "@/lib/api";

type Subject = {
  id: number;
  name: string;
  code: string;
  icon?: string;
};

type ExamType = {
  id: number;
  name: string;
  description?: string;
};

const STREAMS = [
  {
    id: "science",
    name: "Science",
    description: "Physics, Chemistry, Biology, Math",
    subjects: ["Mathematics", "English Language", "Physics", "Chemistry"],
    icon: "science",
  },
  {
    id: "arts",
    name: "Arts",
    description: "Literature, Government, History",
    subjects: [
      "Mathematics",
      "English Language",
      "Literature in English",
      "Government",
    ],
    icon: "palette",
  },
  {
    id: "commercial",
    name: "Commercial",
    description: "Accounting, Commerce, Economics",
    subjects: ["Mathematics", "English Language", "Economics", "Commerce"],
    icon: "account-balance",
  },
];

export default function OnboardingScreen() {
  const { user, updateUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.has_completed_onboarding) {
      router.replace("/(tabs)");
    }
  }, [user, router]);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(false);
  const [fetchingSubjects, setFetchingSubjects] = useState(true);
  const [fetchingExamTypes, setFetchingExamTypes] = useState(true);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);

  // Step-based state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [selectedExamTypes, setSelectedExamTypes] = useState<number[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

  // Load exam types on mount
  useEffect(() => {
    const loadExamTypes = async () => {
      try {
        const response = await api.get("/config/exam-types");
        const examTypesData = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];
        setExamTypes(examTypesData);
      } catch (error) {
        console.log("Error fetching exam types:", error);
      } finally {
        setFetchingExamTypes(false);
      }
    };
    loadExamTypes();
  }, []);
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const response = await api.get("/config/subjects");
        const subjectsData = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];
        setSubjects(subjectsData);
      } catch (error) {
        console.log("Error fetching subjects:", error);
        setSubjectError(
          "Could not load subjects. Please check your connection.",
        );
      } finally {
        setFetchingSubjects(false);
      }
    };
    loadSubjects();
  }, []);

  const toggleExamType = (id: number) => {
    setSelectedExamTypes(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSubject = (subjectId: number) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(subjectId)) {
        return prev.filter((id) => id !== subjectId);
      }
      if (prev.length >= 4) {
        Alert.alert("Limit Reached", "You can only select up to 4 subjects.");
        return prev;
      }
      return [...prev, subjectId];
    });
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!selectedStream) {
        Alert.alert('Required', 'Please select a stream to continue');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (selectedExamTypes.length === 0) {
        Alert.alert('Required', 'Please select at least one exam type');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (selectedSubjects.length === 0) {
      Alert.alert("Selection Required", "Please select at least one subject");
      return;
    }

    setLoading(true);
    try {
      const selectedStreamConfig = STREAMS.find(
        (stream) => stream.id === selectedStream,
      );

      const streamSubjectIds =
        selectedStreamConfig
          ? subjects
              .filter((subject) =>
                selectedStreamConfig.subjects.includes(subject.name),
              )
              .map((subject) => subject.id)
          : [];

      const finalSubjectIds = selectedSubjects.length > 0 ? selectedSubjects : streamSubjectIds;
      const finalStreamValue = selectedStream || "manual";

      if (finalSubjectIds.length === 0) {
        Alert.alert(
          "Selection Required",
          "No matching subjects were found for your selection. Please choose subjects manually.",
        );
        setLoading(false);
        return;
      }

      // Save onboarding data via API
      await api.post("/onboarding", {
        stream: finalStreamValue,
        exam_types: selectedExamTypes,
        subjects: finalSubjectIds,
      });

      // Update auth context with new flag
      if (user) {
        updateUser({ ...user, has_completed_onboarding: true });
      }

      // Navigate to main dashboard (tabs)
      router.replace("/(tabs)");
    } catch (error) {
      console.log("Onboarding error:", error);
      Alert.alert(
        "Error",
        "Failed to save your preferences. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const getProgress = () => Math.round((currentStep / 3) * 100);

  const getSubjectIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("math")) return "calculate";
    if (lowerName.includes("english")) return "menu-book";
    if (lowerName.includes("physics")) return "science";
    if (lowerName.includes("chemistry")) return "science";
    if (lowerName.includes("biology")) return "biotech";
    if (lowerName.includes("econ")) return "trending-up";
    if (lowerName.includes("gov")) return "account-balance";
    return "library-books";
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-neutral-950" : "bg-white"}`}
    >
      <View className="px-6 pt-10 pb-4">
        <View className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 items-center justify-center mb-4">
          <MaterialIcons name="auto-awesome" size={28} color="#4f46e5" />
        </View>
        <Heading size="xl" className="text-neutral-900 dark:text-neutral-50">
          Personalize Your Setup
        </Heading>
        <BodyText variant="subtle" className="mt-2">
          {currentStep === 1 && "Select your area of study"}
          {currentStep === 2 && "Choose the exam(s) you're preparing for"}
          {currentStep === 3 && "Select the subjects you want to study"}
        </BodyText>

        {/* Progress Bar */}
        <View className="flex flex-row justify-between mb-3 mt-6">
          <BodyText className="text-sm text-neutral-600 dark:text-neutral-400">{`Step ${currentStep} of 3`}</BodyText>
          <BodyText className="text-sm text-neutral-600 dark:text-neutral-400">{`${getProgress()}% Complete`}</BodyText>
        </View>
        <View className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mb-4">
          <View
            style={{ width: `${getProgress()}%` }}
            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Step 1: Select Stream */}
        {currentStep === 1 && (
          <View className="space-y-4 pt-2 pb-8">
            {STREAMS.map((stream) => (
              <Card
                key={stream.id}
                variant={selectedStream === stream.id ? "bordered" : "elevated"}
                padding="md"
                onPress={() => setSelectedStream(stream.id)}
                className={
                  selectedStream === stream.id
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/10"
                    : ""
                }
              >
                <View className="flex-row items-start space-x-4">
                  <MaterialIcons
                    name={stream.icon as any}
                    size={28}
                    color={isDark ? "#a1a1aa" : "#71717a"}
                  />
                  <View className="flex-1">
                    <Subheading
                      size="lg"
                      className={
                        selectedStream === stream.id
                          ? "text-primary-700 dark:text-primary-400"
                          : ""
                      }
                    >
                      {stream.name}
                    </Subheading>
                    <BodyText variant="subtle" size="sm" className="mt-1">
                      {stream.description}
                    </BodyText>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedStream === stream.id ? "bg-primary-600 border-primary-600" : "border-neutral-300 dark:border-neutral-600"}`}
                  >
                    {selectedStream === stream.id && (
                      <MaterialIcons name="check" size={14} color="white" />
                    )}
                  </View>
                </View>
                <View className="flex-row flex-wrap gap-2 mt-4">
                  {stream.subjects.map((sub) => (
                    <View
                      key={sub}
                      className="bg-white dark:bg-neutral-800 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700"
                    >
                      <BodyText
                        size="xs"
                        className="text-neutral-600 dark:text-neutral-300"
                      >
                        {sub}
                      </BodyText>
                    </View>
                  ))}
                </View>
              </Card>
            ))}

            {/* Custom Option */}
            <Card
              variant="outlined"
              padding="md"
              onPress={() => setSelectedStream('custom')}
              className={`border-purple-200 dark:border-purple-800 ${selectedStream === 'custom' ? 'border-purple-500' : ''}`}
            >
              <View className="flex-row items-start space-x-4">
                <MaterialIcons
                  name="tune"
                  size={28}
                  color="#a855f7"
                />
                <View className="flex-1">
                  <Subheading
                    size="lg"
                    className={
                      selectedStream === 'custom'
                        ? "text-purple-700 dark:text-purple-400"
                        : "text-purple-700 dark:text-purple-300"
                    }
                  >
                    Choose Subjects Manually
                  </Subheading>
                  <BodyText variant="subtle" size="sm" className="mt-1">
                    Select your own combination of subjects
                  </BodyText>
                </View>
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedStream === 'custom' ? "bg-purple-600 border-purple-600" : "border-neutral-300 dark:border-neutral-600"}`}
                >
                  {selectedStream === 'custom' && (
                    <MaterialIcons name="check" size={14} color="white" />
                  )}
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Step 2: Select Exam Type */}
        {currentStep === 2 && (
          <View className="space-y-3 pt-2 pb-8">
            {fetchingExamTypes ? (
              <View className="py-10 items-center justify-center">
                <ActivityIndicator size="large" color="#4f46e5" />
                <BodyText className="mt-4 text-neutral-900 dark:text-neutral-400">
                  Loading exam types...
                </BodyText>
              </View>
            ) : (
              examTypes.map((examType) => (
                <Card
                  key={examType.id}
                  variant={selectedExamTypes.includes(examType.id) ? "bordered" : "outlined"}
                  padding="md"
                  onPress={() => toggleExamType(examType.id)}
                  className={selectedExamTypes.includes(examType.id) ? "border-blue-500" : ""}
                >
                  <View className="flex-row items-center">
                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-4 ${selectedExamTypes.includes(examType.id) ? 'border-blue-500 bg-blue-500' : 'border-neutral-300 dark:border-neutral-600'}`}>
                      {selectedExamTypes.includes(examType.id) && (
                        <MaterialIcons name="check" size={14} color="white" />
                      )}
                    </View>
                    <View className="flex-1">
                      <BodyText className="font-semibold">{examType.name}</BodyText>
                      {examType.description && (
                        <BodyText variant="subtle" className="mt-1">{examType.description}</BodyText>
                      )}
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {/* Step 3: Select Subjects */}
        {currentStep === 3 && (
          <View className="pt-2 pb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Subheading>Available Subjects</Subheading>
              <BodyText variant="subtle" size="sm">
                {selectedSubjects.length}/4 Selected
              </BodyText>
            </View>

            {fetchingSubjects ? (
              <View className="py-10 items-center justify-center">
                <ActivityIndicator size="large" color="#4f46e5" />
                <BodyText className="mt-4 text-neutral-900 dark:text-neutral-400">
                  Loading subjects...
                </BodyText>
              </View>
            ) : subjectError ? (
              <BodyText className="text-center text-red-600 dark:text-red-400 mt-4">
                {subjectError}
              </BodyText>
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
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                          : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                      }`}
                    >
                      <View className="flex-row justify-between items-start mb-2">
                        <View
                          className={`w-8 h-8 rounded-full items-center justify-center ${isSelected ? "bg-primary-600" : "bg-neutral-100 dark:bg-neutral-800"}`}
                        >
                          <MaterialIcons
                            name={getSubjectIcon(subject.name)}
                            size={16}
                            color={
                              isSelected
                                ? "white"
                                : isDark
                                  ? "#a1a1aa"
                                  : "#71717a"
                            }
                          />
                        </View>
                        {isSelected && (
                          <MaterialIcons
                            name="check-circle"
                            size={20}
                            color="#4f46e5"
                          />
                        )}
                      </View>
                      <BodyText
                        size="sm"
                        className="font-semibold"
                        numberOfLines={1}
                      >
                        {subject.name}
                      </BodyText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View className="py-10 items-center justify-center">
                <BodyText className="mt-4 text-neutral-900 dark:text-neutral-400 text-center">
                  No subjects available.
                </BodyText>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View className="px-6 py-4 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-900">
        {currentStep === 1 ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleNext}
            disabled={!selectedStream}
          >
            Next: Choose Exam Type
          </Button>
        ) : currentStep === 2 ? (
          <View className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onPress={handlePrevious}
            >
              Previous
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onPress={handleNext}
              disabled={selectedExamTypes.length === 0}
            >
              Next: Choose Subjects
            </Button>
          </View>
        ) : (
          <View className="flex gap-3">
            {selectedStream !== 'custom' ? (
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onPress={handlePrevious}
              >
                Previous
              </Button>
            ) : (
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onPress={() => setCurrentStep(1)}
              >
                Back to Streams
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onPress={handleComplete}
              disabled={selectedSubjects.length === 0 || loading}
              loading={loading}
            >
              Complete Setup
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
