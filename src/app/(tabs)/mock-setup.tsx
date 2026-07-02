import { useRouter } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import { Alert, View, ScrollView, ActivityIndicator } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Card, Button } from "@/components";
import {
  Heading,
  Subheading,
  BodyText,
  Caption,
} from "@/components/Typography";
import api from "@/lib/api";
import { storage } from "@/lib/storage";

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
  const isDark = theme === "dark";
  const router = useRouter();

  // Loading flags
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API data
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mockFormats, setMockFormats] = useState<
    Record<string, MockFormatSpec>
  >({});

  // Selections
  const [selectedExamType, setSelectedExamType] = useState<ExamType | null>(
    null,
  );
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareStatus, setPrepareStatus] = useState<string | null>(null);
  const [isUpdatingSelection, setIsUpdatingSelection] = useState(false);

  // Configuration derived from mock formats
  const maxSubjects = 4;

  const fetchSubjectsForExamType = async (
    examTypeId?: number,
  ): Promise<void> => {
    if (!examTypeId) {
      setSubjects([]);
      setSelectedSubjects([]);

      return;
    }

    const subjectsResponse = await api.get("/config/subjects", {
      params: examTypeId ? { exam_type_id: examTypeId } : undefined,
    });

    const fetchedSubjects: Subject[] =
      subjectsResponse.data?.data ?? subjectsResponse.data ?? [];

    setSubjects(fetchedSubjects);

    setSelectedSubjects((previous) => {
      const allowedSubjectIds = new Set(
        fetchedSubjects.map((subject) => subject.id),
      );
      const stillValid = previous.filter((subject) =>
        allowedSubjectIds.has(subject.id),
      );

      if (stillValid.length > 0) {
        return stillValid;
      }

      return [];
    });
  };

  // Fetch all configuration on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [examRes, formatsRes] = await Promise.all([
          api.get("/config/exam-types"),
          api.get("/config/mock-formats"),
        ]);
        const fetchedExamTypes: ExamType[] = examRes.data?.data ?? [];

        setExamTypes(fetchedExamTypes);
        setMockFormats(formatsRes.data?.data ?? {});

        setSelectedExamType(null);

        await fetchSubjectsForExamType(undefined);
      } catch (e) {
        console.warn(e);
        setError(
          "Failed to load configuration. Please check your network connection.",
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const syncSelection = async () => {
      try {
        setIsUpdatingSelection(true);
        await fetchSubjectsForExamType(selectedExamType?.id);
      } catch (fetchError) {
        console.warn("Failed to sync selection options", fetchError);
      } finally {
        setIsUpdatingSelection(false);
      }
    };

    syncSelection();
  }, [selectedExamType]);

  const toggleSubject = (subject: Subject) => {
    const already = selectedSubjects.find((s) => s.id === subject.id);
    if (already) {
      setSelectedSubjects(selectedSubjects.filter((s) => s.id !== subject.id));
    } else if (selectedSubjects.length < maxSubjects) {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const startMock = async () => {
    if (!selectedExamType) {
      return;
    }

    try {
      setIsPreparing(true);
      setPrepareStatus("Creating mock session...");

      const payload = {
        exam_type_id: selectedExamType.id,
        subject_ids: selectedSubjects.map((s) => s.id),
        year: null,
        shuffle: true,
      };
      const res = await api.post("/mock/sessions", payload);
      const sessionData = res.data?.data;
      const sessionId = sessionData?.mock_session_id ?? sessionData?.session_id;

      if (!sessionId) {
        throw new Error("Failed to create a mock session ID.");
      }

      // Persist the full session payload so the quiz screen can read
      // subject configs, time limits, etc. without an extra API round-trip.
      await storage.setItem(
        `mock_session_${sessionId}`,
        JSON.stringify(sessionData),
      );

      router.push(`/mock/${sessionId}`);
    } catch (e: any) {
      const message =
        e.response?.data?.message || e.message || "An unknown error occurred.";
      Alert.alert("Failed to Start Mock Exam", message);
      setError(message);
    } finally {
      setIsPreparing(false);
      setPrepareStatus(null);
    }
  };

  // UI Rendering
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
        <BodyText className="mt-4 text-neutral-900 dark:text-neutral-400">
          Loading options...
        </BodyText>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-8">
        <MaterialIcons name="cloud-off" size={48} color="#a1a1aa" />
        <BodyText className="mt-4 text-center text-neutral-900 dark:text-neutral-400">
          {error}
        </BodyText>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View className="pt-16 pb-6 px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <Heading size="xl" className="mb-2">
          Mock Exam Setup
        </Heading>
        <BodyText className="text-neutral-900 dark:text-neutral-400">
          Choose exam type and up to {maxSubjects} subjects for a full mock
          experience.
        </BodyText>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1">
          {/* Exam Type Selection */}
          <Subheading size="md" className="mb-3 px-2">
            Select Exam Type
          </Subheading>
          {isUpdatingSelection ? (
            <View className="flex-row items-center px-2 mb-3">
              <ActivityIndicator size="small" color="#4f46e5" />
              <Caption className="ml-2 text-neutral-500 dark:text-neutral-400">
                Updating exam type options...
              </Caption>
            </View>
          ) : null}
          <View className="flex flex-wrap gap-2 mb-8 pl-2">
            {examTypes.map((et) => (
              <Button
                key={et.id}
                variant={selectedExamType?.id === et.id ? "primary" : "outline"}
                onPress={() => setSelectedExamType(et)}
                disabled={isUpdatingSelection}
                size="sm"
                style={{ marginRight: 12, marginBottom: 12 }}
              >
                {et.name}
              </Button>
            ))}
          </View>

          {/* Subject Selection */}
          <Subheading size="md" className="mb-3 px-2">
            Select Subjects (max {maxSubjects})
          </Subheading>
          {!selectedExamType ? (
            <Card
              variant="bordered"
              padding="md"
              className="mx-2 mb-6 bg-white dark:bg-neutral-900"
            >
              <Caption className="text-neutral-500 dark:text-neutral-400">
                Select an exam type to load available subjects.
              </Caption>
            </Card>
          ) : null}

          <View className="flex-row flex-wrap px-2 mb-6">
            {subjects.map((sub) => {
              const selected = selectedSubjects.find((s) => s.id === sub.id);
              const canSelect =
                selectedSubjects.length < maxSubjects || !!selected;
              return (
                <Button
                  key={sub.id}
                  variant={selected ? "primary" : "outline"}
                  onPress={() => toggleSubject(sub)}
                  disabled={!canSelect && !selected}
                  size="sm"
                  style={{ marginRight: 12, marginBottom: 12 }}
                >
                  {sub.name}
                </Button>
              );
            })}
          </View>

          {subjects.length === 0 ? (
            <Card
              variant="bordered"
              padding="md"
              className="mx-2 mb-6 bg-white dark:bg-neutral-900"
            >
              <Caption className="text-neutral-500 dark:text-neutral-400">
                No subjects are currently mapped to this exam type.
              </Caption>
            </Card>
          ) : null}

          <View className="mb-24" />
        </View>
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-lg border-t border-neutral-200 dark:border-neutral-800">
        {isPreparing && prepareStatus ? (
          <View className="flex-row items-center mb-3">
            <ActivityIndicator size="small" color="#4f46e5" />
            <Caption className="ml-2 text-neutral-700 dark:text-neutral-300">
              {prepareStatus}
            </Caption>
          </View>
        ) : null}

        <Button
          onPress={startMock}
          disabled={
            !selectedExamType || selectedSubjects.length === 0 || isPreparing
          }
          loading={isPreparing}
          size="lg"
          variant="primary"
          fullWidth
        >
          Start Mock Exam
        </Button>
      </View>
    </View>
  );
}
