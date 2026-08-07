import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button, Card } from "@/components";
import {
  Heading,
  BodyText,
  Subheading,
  Caption,
} from "@/components/Typography";
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

type StreamOption = {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
};

export default function OnboardingScreen() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (user?.has_completed_onboarding) {
      router.replace("/(tabs)");
    }
  }, [user, router]);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [streams, setStreams] = useState<StreamOption[]>([]);

  // Step-based state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [selectedExamTypes, setSelectedExamTypes] = useState<number[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

  const availableSubjects = subjects;

  const loadBootstrap = async () => {
    try {
      setBootstrapLoading(true);
      setBootstrapError(null);
      const response = await api.get("/onboarding/bootstrap");
      const payload = response.data?.data ?? response.data ?? {};
      setStreams(Array.isArray(payload.streams) ? payload.streams : []);
      setExamTypes(Array.isArray(payload.exam_types) ? payload.exam_types : []);
      setSubjects(Array.isArray(payload.subjects) ? payload.subjects : []);
    } catch (error) {
      console.log("Error fetching onboarding bootstrap data:", error);
      setBootstrapError(
        "Could not load setup data. Please check your connection.",
      );
    } finally {
      setBootstrapLoading(false);
    }
  };

  useEffect(() => {
    loadBootstrap();
  }, []);

  const toggleExamType = (id: number) => {
    setSelectedExamTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSubject = (subjectId: number) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(subjectId)) {
        return prev.filter((id) => id !== subjectId);
      }
      return [...prev, subjectId];
    });
  };

  const handleStreamSelect = (streamId: string) => {
    setSelectedStream(streamId);
    if (streamId === "custom") {
      setCurrentStep(3);
    } else {
      setCurrentStep(2);
    }
  };

  const handleNext = () => {
    if (currentStep === 2) {
      if (selectedExamTypes.length === 0) {
        Alert.alert("Required", "Please select at least one exam type");
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      router.back();
      return;
    }

    if (currentStep === 3 && selectedStream === "custom") {
      setCurrentStep(1);
      return;
    }

    setCurrentStep(currentStep - 1);
  };

  const handleComplete = async () => {
    if (selectedSubjects.length === 0) {
      Alert.alert("Selection Required", "Please select at least one subject");
      return;
    }

    setLoading(true);
    try {
      const finalStreamValue = selectedStream || "manual";

      // Save onboarding data via API
      await api.post("/onboarding", {
        stream: finalStreamValue,
        exam_types: selectedExamTypes,
        subjects: selectedSubjects,
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
      <View
        className="px-6 pb-4"
        style={{ paddingTop: Math.max(insets.top, 12) + 12 }}
      >
        <Button
          variant="ghost"
          onPress={handleBack}
          className="self-start mb-4"
          accessibilityLabel="Go back"
        >
          <View className="flex-row items-center gap-2">
            <MaterialIcons
              name="arrow-back"
              size={18}
              color={isDark ? "#fff" : "#171717"}
            />
            <BodyText>
              {currentStep === 1
                ? "Back"
                : currentStep === 3 && selectedStream === "custom"
                  ? "Back to Streams"
                  : "Previous"}
            </BodyText>
          </View>
        </Button>
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

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Select Stream */}
        {currentStep === 1 && (
          <View className="flex gap-4 pt-2 pb-8">
            {bootstrapLoading ? (
              <View className="py-10 items-center justify-center">
                <ActivityIndicator size="large" color="#4f46e5" />
                <BodyText className="mt-4 text-neutral-900 dark:text-neutral-400">
                  Loading setup data...
                </BodyText>
              </View>
            ) : bootstrapError ? (
              <View className="py-10 items-center justify-center">
                <BodyText className="text-center text-red-600 dark:text-red-400">
                  {bootstrapError}
                </BodyText>
                <Button
                  variant="outline"
                  className="mt-4"
                  onPress={loadBootstrap}
                >
                  Retry
                </Button>
              </View>
            ) : streams.length === 0 ? (
              <View className="py-10 items-center justify-center">
                <BodyText className="text-center text-neutral-900 dark:text-neutral-400">
                  No streams available right now.
                </BodyText>
              </View>
            ) : (
              streams.map((stream) => (
                <Card
                  key={stream.slug}
                  variant={
                    selectedStream === stream.slug ? "bordered" : "elevated"
                  }
                  padding="md"
                  onPress={() => handleStreamSelect(stream.slug)}
                  className={
                    selectedStream === stream.slug
                      ? "mb-3 border-primary-500 bg-primary-50 dark:bg-primary-900/10"
                      : "mb-3"
                  }
                >
                  <View className="flex-row items-start space-x-4">
                    <BodyText className="text-4xl flex-shrink-0">
                      {stream.icon || "📘"}
                    </BodyText>
                    <View className="flex-1">
                      <Subheading
                        size="lg"
                        className={
                          selectedStream === stream.slug
                            ? "text-primary-700 dark:text-primary-400"
                            : ""
                        }
                      >
                        {stream.name}
                      </Subheading>
                      <BodyText variant="subtle" size="sm" className="mt-1">
                        {stream.description || ""}
                      </BodyText>
                    </View>
                    <View
                      className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedStream === stream.slug ? "bg-primary-600 border-primary-600" : "border-neutral-300 dark:border-neutral-600"}`}
                    >
                      {selectedStream === stream.slug && (
                        <MaterialIcons name="check" size={14} color="white" />
                      )}
                    </View>
                  </View>
                </Card>
              ))
            )}

            {/* Custom Option */}
            <Card
              variant="outlined"
              padding="md"
              onPress={() => handleStreamSelect("custom")}
              className={`mb-3 border-purple-200 dark:border-purple-800 ${selectedStream === "custom" ? "border-purple-500" : ""}`}
            >
              <View className="flex-row items-start space-x-4">
                <MaterialIcons name="tune" size={28} color="#a855f7" />
                <View className="flex-1">
                  <Subheading
                    size="lg"
                    className={
                      selectedStream === "custom"
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
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedStream === "custom" ? "bg-purple-600 border-purple-600" : "border-neutral-300 dark:border-neutral-600"}`}
                >
                  {selectedStream === "custom" && (
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
            <BodyText className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
              Tap a selected exam type again to uncheck it.
            </BodyText>
            {bootstrapLoading ? (
              <View className="py-10 items-center justify-center">
                <ActivityIndicator size="large" color="#4f46e5" />
                <BodyText className="mt-4 text-neutral-900 dark:text-neutral-400">
                  Loading setup data...
                </BodyText>
              </View>
            ) : bootstrapError ? (
              <View className="py-10 items-center justify-center">
                <BodyText className="text-center text-red-600 dark:text-red-400">
                  {bootstrapError}
                </BodyText>
                <Button
                  variant="outline"
                  className="mt-4"
                  onPress={loadBootstrap}
                >
                  Retry
                </Button>
              </View>
            ) : examTypes.length === 0 ? (
              <View className="py-10 items-center justify-center">
                <BodyText className="text-center text-neutral-900 dark:text-neutral-400">
                  No exam types available right now.
                </BodyText>
                <Button
                  variant="outline"
                  className="mt-4"
                  onPress={loadBootstrap}
                >
                  Refresh
                </Button>
              </View>
            ) : (
              examTypes.map((examType) => (
                <Card
                  key={examType.id}
                  variant={
                    selectedExamTypes.includes(examType.id)
                      ? "bordered"
                      : "outlined"
                  }
                  padding="md"
                  onPress={() => toggleExamType(examType.id)}
                  className={
                    selectedExamTypes.includes(examType.id)
                      ? "border-blue-500"
                      : ""
                  }
                >
                  <View className="flex-row items-center">
                    <View
                      className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-4 ${selectedExamTypes.includes(examType.id) ? "border-blue-500 bg-blue-500" : "border-neutral-300 dark:border-neutral-600"}`}
                    >
                      {selectedExamTypes.includes(examType.id) && (
                        <MaterialIcons name="check" size={14} color="white" />
                      )}
                    </View>
                    <View className="flex-1">
                      <BodyText className="font-semibold">
                        {examType.name}
                      </BodyText>
                      {examType.description && (
                        <BodyText variant="subtle" className="mt-1">
                          {examType.description}
                        </BodyText>
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
                {selectedSubjects.length} Selected
              </BodyText>
            </View>

            <BodyText className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Tap a selected subject again to uncheck it.
            </BodyText>

            {selectedSubjects.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mb-4">
                {selectedSubjects.map((subjectId) => {
                  const subject = subjects.find(
                    (item) => item.id === subjectId,
                  );

                  return (
                    <Button
                      key={subjectId}
                      variant="outline"
                      size="sm"
                      onPress={() => toggleSubject(subjectId)}
                      className="rounded-full"
                    >
                      <View className="flex-row items-center gap-2">
                        <BodyText className="text-sm">
                          {subject?.name || `Subject ${subjectId}`}
                        </BodyText>
                        <MaterialIcons
                          name="close"
                          size={16}
                          color={isDark ? "#fff" : "#171717"}
                        />
                      </View>
                    </Button>
                  );
                })}

                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => setSelectedSubjects([])}
                  className="rounded-full"
                >
                  Clear all
                </Button>
              </View>
            )}

            {bootstrapLoading ? (
              <View className="py-10 items-center justify-center">
                <ActivityIndicator size="large" color="#4f46e5" />
                <BodyText className="mt-4 text-neutral-900 dark:text-neutral-400">
                  Loading setup data...
                </BodyText>
              </View>
            ) : bootstrapError && availableSubjects.length === 0 ? (
              <View className="py-10 items-center justify-center">
                <BodyText className="text-center text-red-600 dark:text-red-400 mt-4">
                  {bootstrapError}
                </BodyText>
                <Button
                  variant="outline"
                  className="mt-4"
                  onPress={loadBootstrap}
                >
                  Retry
                </Button>
              </View>
            ) : availableSubjects.length > 0 ? (
              <View className="flex-row flex-wrap justify-between gap-y-3">
                {availableSubjects.map((subject) => {
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

            <View className="mt-6 flex gap-3">
              {selectedStream !== "custom" ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onPress={handleBack}
                >
                  Previous
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onPress={handleBack}
                >
                  Back to Streams
                </Button>
              )}
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onPress={handleComplete}
                disabled={selectedSubjects.length === 0 || loading}
                loading={loading}
              >
                Complete Setup
              </Button>
            </View>
          </View>
        )}
      </ScrollView>

      {currentStep === 2 && (
        <View
          className="px-6 py-4 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-900"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onPress={handleBack}
            >
              Previous
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onPress={handleNext}
              disabled={selectedExamTypes.length === 0}
            >
              Next: Choose Subjects
            </Button>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
