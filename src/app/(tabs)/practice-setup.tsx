import { useRouter, useFocusEffect } from "expo-router";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNetInfo } from "@react-native-community/netinfo";

import { storage } from "@/lib/storage";
import {
  Alert,
  View,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Card, Button } from "@/components";
import {
  Heading,
  Subheading,
  BodyText,
  Caption,
} from "@/components/Typography";
import api from "@/lib/api";

type Subject = {
  id: number;
  name: string;
};

type ExamType = {
  id: number;
  name: string;
};

type Year = {
  year: number | string;
  label: string;
};

type ActiveAttempt = {
  id: number;
  subject_id: number;
  subject_name: string;
  exam_type_id: number | null;
  exam_type_name: string | null;
  exam_year: number | null;
  total_questions: number;
  current_question_index: number;
  started_at: string;
  time_limit: number | null;
  is_timed: boolean;
};

function normalizeYears(input: unknown): Year[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (typeof item === "number" || typeof item === "string") {
        return {
          year: item,
          label: String(item),
        };
      }

      if (item && typeof item === "object") {
        const maybeYear = (item as { year?: number | string }).year;
        const maybeLabel = (item as { label?: string }).label;

        if (maybeYear !== undefined) {
          return {
            year: maybeYear,
            label: maybeLabel ?? String(maybeYear),
          };
        }
      }

      return null;
    })
    .filter((item): item is Year => Boolean(item));
}

function toNumericYear(selectedYear: Year | null): number | undefined {
  if (!selectedYear || selectedYear.year === "all") {
    return undefined;
  }

  const parsedYear = Number(selectedYear.year);

  return Number.isFinite(parsedYear) ? parsedYear : undefined;
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export default function PracticeSetupScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [selectedExamType, setSelectedExamType] = useState<ExamType | null>(
    null,
  );
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);
  const [questionCountInput, setQuestionCountInput] = useState("");
  const [questionCountError, setQuestionCountError] = useState<string | null>(null);
  const [timeLimitInput, setTimeLimitInput] = useState("");
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareStatus, setPrepareStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingYears, setIsLoadingYears] = useState(false);
  const [isApplyingYearSelection, setIsApplyingYearSelection] = useState(false);
  const [isLoadingExamTypeSelection, setIsLoadingExamTypeSelection] =
    useState(false);
  const yearSelectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [activeAttempts, setActiveAttempts] = useState<ActiveAttempt[]>([]);
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);
  const [availableQuestionCount, setAvailableQuestionCount] = useState<
    number | null
  >(null);
  const [isLoadingQuestionCount, setIsLoadingQuestionCount] = useState(false);

  const loadYears = async (subjectId?: number, examTypeId?: number) => {
    try {
      setIsLoadingYears(true);

      if (!subjectId || !examTypeId) {
        setYears([{ year: "all", label: "All Years" }]);
        setSelectedYear({ year: "all", label: "All Years" });

        return;
      }

      const yearsRes = await api.get("/config/years", {
        params: {
          subject_id: subjectId,
          exam_type_id: examTypeId,
        },
      });

      const fetchedYears = normalizeYears(
        yearsRes.data?.data ?? yearsRes.data ?? [],
      );

      setYears([{ year: "all", label: "All Years" }, ...fetchedYears]);
      setSelectedYear((previous) => {
        if (!previous) {
          return { year: "all", label: "All Years" };
        }

        const stillExists = fetchedYears.some((yearOption) => {
          return String(yearOption.year) === String(previous.year);
        });

        if (previous.year === "all" || stillExists) {
          return previous;
        }

        return { year: "all", label: "All Years" };
      });
    } finally {
      setIsLoadingYears(false);
    }
  };

  const loadActiveAttempts = async () => {
    try {
      setIsLoadingAttempts(true);
      const response = await api.get("/practice/active-attempts");
      setActiveAttempts(response.data?.attempts ?? []);
    } catch (e) {
      console.error("Failed to load active attempts:", e);
    } finally {
      setIsLoadingAttempts(false);
    }
  };

  const loadQuestionCount = async (
    subjectId?: number,
    examTypeId?: number,
    year?: number | string,
  ) => {
    try {
      setIsLoadingQuestionCount(true);
      const params: Record<string, number> = { subject_id: subjectId! };

      if (examTypeId) {
        params.exam_type_id = examTypeId;
      }

      if (year && year !== "all") {
        params.year = Number(year);
      }

      const response = await api.get("/practice/question-count", { params });
      setAvailableQuestionCount(response.data?.count ?? null);
    } catch (e: any) {
      console.error("Failed to load question count:", e);
      console.error("Error response:", e?.response?.data);
      console.error("Error status:", e?.response?.status);
      setAvailableQuestionCount(null);
    } finally {
      setIsLoadingQuestionCount(false);
    }
  };

  const resumeAttempt = async (attemptId: number) => {
    try {
      setIsPreparing(true);
      setPrepareStatus("Resuming practice session...");

      const response = await api.get(`/practice/load/${attemptId}`);
      const attemptData = response.data;

      await storage.setItem(
        `practice_attempt_${attemptId}`,
        JSON.stringify(attemptData),
      );

      router.push(`/practice/${attemptId}`);
    } catch (error: any) {
      Alert.alert(
        "Failed to Resume",
        error?.response?.data?.message ?? error?.message ?? "Unknown error",
      );
    } finally {
      setIsPreparing(false);
      setPrepareStatus(null);
    }
  };

  const dismissAttempt = async (attemptId: number) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you sure you want to dismiss this practice session?",
      );

      if (!confirmed) return;

      await performDismiss(attemptId);
      return;
    }

    Alert.alert(
      "Dismiss Practice Session",
      "Are you sure you want to dismiss this practice session?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Dismiss",
          style: "destructive",
          onPress: () => performDismiss(attemptId),
        },
      ],
    );
  };

  const performDismiss = async (attemptId: number) => {
    try {
      const response = await api.delete(`/practice/attempts/${attemptId}`);

      setActiveAttempts((prev) => prev.filter((a) => a.id !== attemptId));
    } catch (error: any) {
      Alert.alert(
        "Failed to Dismiss",
        error?.response?.data?.message ?? error?.message ?? "Unknown error",
      );
    }
  };
  const getMatchingAttempt = (): ActiveAttempt | null => {
    if (!selectedSubject) return null;

    return (
      activeAttempts.find((attempt) => {
        const subjectMatch = attempt.subject_id === selectedSubject.id;
        const examTypeMatch =
          !selectedExamType || attempt.exam_type_id === selectedExamType.id;
        const yearMatch =
          !selectedYear ||
          selectedYear.year === "all" ||
          attempt.exam_year === Number(selectedYear.year);

        return subjectMatch && examTypeMatch && yearMatch;
      }) ?? null
    );
  };

  const handleYearSelection = (yearOption: Year) => {
    setSelectedYear(yearOption);
    setIsApplyingYearSelection(true);

    if (yearSelectionTimerRef.current) {
      clearTimeout(yearSelectionTimerRef.current);
    }

    yearSelectionTimerRef.current = setTimeout(() => {
      setIsApplyingYearSelection(false);
    }, 500);
  };

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [subjectsRes, examTypesRes] = await Promise.all([
          api.get("/config/subjects"),
          api.get("/config/exam-types"),
        ]);

        const fetchedSubjects: Subject[] =
          subjectsRes.data?.data ?? subjectsRes.data ?? [];
        const fetchedExamTypes: ExamType[] =
          examTypesRes.data?.data ?? examTypesRes.data ?? [];

        setExamTypes(fetchedExamTypes);
        setSubjects(fetchedSubjects);
        setSelectedYear({ year: "all", label: "All Years" });

        if (fetchedSubjects.length > 0) {
          setSelectedSubject(fetchedSubjects[0]);
        } else {
          await loadYears(undefined, undefined);
        }

        // Load active attempts
        await loadActiveAttempts();
      } catch (e) {
        setError("Could not load configuration. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  useEffect(() => {
    if (!selectedSubject || !selectedExamType) {
      return;
    }

    loadYears(selectedSubject.id, selectedExamType.id).catch(() => {
      setYears([{ year: "all", label: "All Years" }]);
      setSelectedYear({ year: "all", label: "All Years" });
    });
  }, [selectedSubject, selectedExamType]);

  // Load question count when selections change
  useEffect(() => {
    if (!selectedSubject) {
      setAvailableQuestionCount(null);
      return;
    }

    loadQuestionCount(
      selectedSubject.id,
      selectedExamType?.id,
      selectedYear?.year,
    );
  }, [selectedSubject, selectedExamType, selectedYear]);

  useEffect(() => {
    setIsLoadingExamTypeSelection(true);
    const timer = setTimeout(() => {
      setIsLoadingExamTypeSelection(false);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [selectedExamType]);

  useEffect(() => {
    return () => {
      if (yearSelectionTimerRef.current) {
        clearTimeout(yearSelectionTimerRef.current);
      }
    };
  }, []);

  // Auto-refresh when connection is restored
  const netInfo = useNetInfo();
  useEffect(() => {
    if (netInfo.isConnected === true && !isLoading) {
      const fetchConfig = async () => {
        try {
          setError(null);
          const [subjectsRes, examTypesRes] = await Promise.all([
            api.get("/config/subjects"),
            api.get("/config/exam-types"),
          ]);

          const fetchedSubjects: Subject[] =
            subjectsRes.data?.data ?? subjectsRes.data ?? [];
          const fetchedExamTypes: ExamType[] =
            examTypesRes.data?.data ?? examTypesRes.data ?? [];

          setExamTypes(fetchedExamTypes);
          setSubjects(fetchedSubjects);
          setSelectedYear({ year: "all", label: "All Years" });

          if (fetchedSubjects.length > 0) {
            setSelectedSubject(fetchedSubjects[0]);
          } else {
            await loadYears(undefined, undefined);
          }
        } catch (e) {
          setError(
            "Could not load configuration. Please check your connection.",
          );
        }
      };
      fetchConfig();
    }
  }, [netInfo.isConnected]);

  const startPracticeSession = async () => {
    const questionCount =
      questionCountInput.trim() !== "" ? Number(questionCountInput) : undefined;

    const timeLimit =
      timeLimitInput.trim() !== "" ? Number(timeLimitInput) : undefined;

    if (
      questionCount !== undefined &&
      (!Number.isFinite(questionCount) || questionCount <= 0)
    ) {
      Alert.alert("Invalid Question Count", "Enter a value greater than 0.");
      return;
    }

    if (
      timeLimit !== undefined &&
      (!Number.isFinite(timeLimit) || timeLimit <= 0)
    ) {
      Alert.alert("Invalid Time Limit", "Enter a value greater than 0.");
      return;
    }

    if (!selectedSubject) {
      Alert.alert("Subject Required", "Please select a subject.");
      return;
    }

    try {
      setIsPreparing(true);
      setPrepareStatus("Creating practice session...");

      const payload = {
        subject: selectedSubject.id,

        exam_type: selectedExamType?.id,

        year:
          selectedYear?.year !== "all" ? Number(selectedYear?.year) : undefined,

        limit: questionCount,

        time: timeLimit,

        shuffle: shuffleQuestions,
      };
      const response = await api.post("/practice/start", payload);

      const attemptData = response.data?.data ?? response.data;
      if (!attemptData?.attempt_id) {
        throw new Error(
          "Practice session created but no attempt ID was returned.",
        );
      }

      await storage.setItem(
        `practice_attempt_${attemptData.attempt_id}`,
        JSON.stringify(attemptData),
      );

      router.push(`/practice/${attemptData.attempt_id}`);
    } catch (error: any) {
      Alert.alert(
        "Failed to Start Practice",
        error?.response?.data?.message ?? error?.message ?? "Unknown error",
      );
    } finally {
      setIsPreparing(false);
      setPrepareStatus(null);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
        <BodyText className="mt-4 text-neutral-500">
          Loading options...
        </BodyText>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-8">
        <MaterialIcons name="cloud-off" size={48} color="#a1a1aa" />
        <BodyText className="mt-4 text-center text-neutral-500">
          {error}
        </BodyText>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <View className="pt-16 pb-6 px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <Heading size="xl" className="mb-2">
          Practice Mode
        </Heading>
        <BodyText className="text-neutral-900 dark:text-neutral-400">
          Focus on specific subjects and past questions to sharpen your skills
          at your own pace.
        </BodyText>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {activeAttempts.length > 0 && (
          <>
            <Subheading size="md" className="mb-3 px-2">
              Resume In-Progress Quizzes
            </Subheading>
            {isLoadingAttempts ? (
              <View className="flex-row items-center px-2 mb-6">
                <ActivityIndicator size="small" color="#4f46e5" />
                <Caption className="ml-2 text-neutral-500 dark:text-neutral-400">
                  Loading in-progress quizzes...
                </Caption>
              </View>
            ) : (
              <View className="mb-6">
                {activeAttempts.map((attempt) => (
                  <Card
                    key={attempt.id}
                    variant="bordered"
                    padding="md"
                    className="mb-3 bg-white dark:bg-neutral-900"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <BodyText className="font-semibold mb-1">
                          {attempt.subject_name}
                        </BodyText>
                        <View className="flex-row items-center gap-2 mb-1">
                          {attempt.exam_type_name && (
                            <Caption className="text-neutral-500 dark:text-neutral-400">
                              {attempt.exam_type_name}
                            </Caption>
                          )}
                          {attempt.exam_year && (
                            <Caption className="text-neutral-500 dark:text-neutral-400">
                              • {attempt.exam_year}
                            </Caption>
                          )}
                        </View>
                        <View className="flex-row items-center gap-2">
                          <Caption className="text-neutral-500 dark:text-neutral-400">
                            {attempt.current_question_index + 1} /{" "}
                            {attempt.total_questions} questions
                          </Caption>
                          {attempt.is_timed && (
                            <View className="px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30">
                              <Caption className="text-primary-700 dark:text-primary-300 text-xs">
                                Timed
                              </Caption>
                            </View>
                          )}
                        </View>
                      </View>
                      <View className="flex-row gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onPress={() => dismissAttempt(attempt.id)}
                        >
                          Dismiss
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onPress={() => resumeAttempt(attempt.id)}
                        >
                          Resume
                        </Button>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </>
        )}

        <Subheading size="md" className="mb-3 px-2">
          Select Subject
        </Subheading>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-8 pl-2"
        >
          {subjects.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              activeOpacity={0.7}
              onPress={() => setSelectedSubject(subject)}
              className={`mr-3 px-5 py-3 rounded-full border-2 ${
                selectedSubject?.id === subject.id
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
                  : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
              }`}
            >
              <BodyText
                className={`font-medium ${selectedSubject?.id === subject.id ? "text-primary-600 dark:text-primary-400" : ""}`}
              >
                {subject.name}
              </BodyText>
            </TouchableOpacity>
          ))}
          <View className="w-4" />
        </ScrollView>

        <Subheading size="md" className="mb-3 px-2">
          Select Exam Type (Optional)
        </Subheading>
        {isLoadingExamTypeSelection ? (
          <View className="flex-row items-center px-2 mb-3">
            <ActivityIndicator size="small" color="#4f46e5" />
            <Caption className="ml-2 text-neutral-500 dark:text-neutral-400">
              Applying exam type...
            </Caption>
          </View>
        ) : null}
        <View className="flex-row flex-wrap px-2 mb-6">
          <Button
            onPress={() => {
              setSelectedExamType(null);
              setSelectedYear({ year: "all", label: "All Years" });
            }}
            variant={selectedExamType === null ? "primary" : "outline"}
            size="sm"
            style={{ marginRight: 12, marginBottom: 12 }}
          >
            All Exam Types
          </Button>
          {examTypes.map((examType) => (
            <Button
              key={examType.id}
              onPress={() => {
                setSelectedExamType(examType);
                setSelectedYear({ year: "all", label: "All Years" });
              }}
              variant={
                selectedExamType?.id === examType.id ? "primary" : "outline"
              }
              size="sm"
              style={{ marginRight: 12, marginBottom: 12 }}
            >
              {examType.name}
            </Button>
          ))}
        </View>

        <Subheading size="md" className="mb-3 px-2">
          Select Year
        </Subheading>
        {isLoadingYears || isApplyingYearSelection ? (
          <View className="flex-row items-center px-2 mb-3">
            <ActivityIndicator size="small" color="#4f46e5" />
            <Caption className="ml-2 text-neutral-500 dark:text-neutral-400">
              {isLoadingYears ? "Loading years..." : "Applying year..."}
            </Caption>
          </View>
        ) : null}
        <View className="flex-row flex-wrap px-2 mb-6">
          {years.map((y) => (
            <Button
              key={String(y.year)}
              onPress={() => handleYearSelection(y)}
              variant={selectedYear?.year === y.year ? "primary" : "outline"}
              disabled={!selectedSubject || !selectedExamType}
              size="sm"
              style={{ marginRight: 12, marginBottom: 12 }}
            >
              {y.label ?? String(y.year)}
            </Button>
          ))}
        </View>

        {years.length === 0 ? (
          <Card
            variant="bordered"
            padding="md"
            className="mb-6 bg-white dark:bg-neutral-900"
          >
            <Caption className="text-neutral-500 dark:text-neutral-400">
              No exam years found. You can still continue with All Years.
            </Caption>
          </Card>
        ) : null}

        <Subheading size="md" className="mb-3 px-2">
          Practice Settings
        </Subheading>
        <Card
          variant="bordered"
          padding="md"
          className="mb-6 bg-white dark:bg-neutral-900"
        >
          <View className="mb-4">
            <BodyText className="font-semibold mb-2">Question Count</BodyText>
            <View className="flex-row items-center gap-2 mb-2">
              <TextInput
                value={questionCountInput}
                onChangeText={(text) => {
                  setQuestionCountInput(text);
                  if (text && availableQuestionCount !== null) {
                    const count = parseInt(text, 10);
                    if (count > availableQuestionCount) {
                      setQuestionCountError(`Only ${availableQuestionCount} questions available`);
                    } else {
                      setQuestionCountError(null);
                    }
                  } else {
                    setQuestionCountError(null);
                  }
                }}
                keyboardType="number-pad"
                placeholder="All questions"
                placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
                className={`flex-1 rounded-xl border px-3 py-2 text-neutral-900 dark:text-neutral-100 ${
                  questionCountError
                    ? "border-red-500 dark:border-red-500"
                    : "border-neutral-300 dark:border-neutral-700"
                } bg-white dark:bg-neutral-900`}
              />
              {availableQuestionCount !== null && availableQuestionCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    setQuestionCountInput("");
                    setQuestionCountError(null);
                  }}
                >
                  Use All ({availableQuestionCount})
                </Button>
              )}
            </View>
            {questionCountError && (
              <Caption className="text-red-600 dark:text-red-400 mb-2">
                {questionCountError}
              </Caption>
            )}
            <Caption className="text-neutral-500 dark:text-neutral-400">
              {isLoadingQuestionCount
                ? "Loading available questions..."
                : availableQuestionCount !== null
                  ? `${availableQuestionCount} questions available`
                  : "Leave blank to practice all available questions."}
            </Caption>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1 pr-4">
              <View className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center mr-3">
                <MaterialIcons
                  name="timer"
                  size={20}
                  color={isDark ? "#a1a1aa" : "#52525b"}
                />
              </View>
              <View>
                <BodyText className="font-semibold mb-1">Time Limit</BodyText>
                <Caption className="text-neutral-900">
                  Leave blank for untimed practice
                </Caption>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <TextInput
                value={timeLimitInput}
                onChangeText={setTimeLimitInput}
                keyboardType="number-pad"
                placeholder="No limit"
                placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
                className="w-28 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-neutral-900 dark:text-neutral-100"
              />
              {timeLimitInput ? (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setTimeLimitInput("")}
                >
                  No Limit
                </Button>
              ) : null}
            </View>
          </View>

          <View className="flex-row items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-4">
            <View className="flex-row items-center flex-1 pr-4">
              <View className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center mr-3">
                <MaterialIcons
                  name="shuffle"
                  size={20}
                  color={isDark ? "#a1a1aa" : "#52525b"}
                />
              </View>
              <View>
                <BodyText className="font-semibold mb-1">
                  Shuffle Questions
                </BodyText>
                <Caption className="text-neutral-900">
                  Randomize the order of questions. Answers and explanations show automatically.
                </Caption>
              </View>
            </View>
            <Switch
              value={shuffleQuestions}
              onValueChange={setShuffleQuestions}
              trackColor={{
                false: isDark ? "#3f3f46" : "#e4e4e7",
                true: "#4f46e5",
              }}
            />
          </View>
        </Card>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-lg border-t border-neutral-200 dark:border-neutral-800">
        {isPreparing && prepareStatus ? (
          <View className="flex-row items-center mb-3">
            <ActivityIndicator size="small" color="#4f46e5" />
            <Caption className="ml-2 text-neutral-700 dark:text-neutral-300">
              {prepareStatus}
            </Caption>
          </View>
        ) : null}

        <View className="flex-row gap-3">
          {getMatchingAttempt() && (
            <Button
              onPress={() => resumeAttempt(getMatchingAttempt()!.id)}
              size="lg"
              loading={isPreparing}
              disabled={isPreparing}
              style={{ flex: 1 }}
            >
              Resume
            </Button>
          )}
          <Button
            onPress={startPracticeSession}
            size="lg"
            loading={isPreparing}
            disabled={!selectedSubject || isPreparing}
            fullWidth={!getMatchingAttempt()}
            style={getMatchingAttempt() ? { flex: 1 } : undefined}
          >
            Start Practice Session
          </Button>
        </View>
      </View>
    </View>
  );
}
