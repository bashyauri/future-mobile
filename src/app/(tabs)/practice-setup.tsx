import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
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
import { downloadMissingSubjects } from "@/lib/offlineDownload";

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

export default function PracticeSetupScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [selectedExamType, setSelectedExamType] = useState<ExamType | null>(
    null,
  );
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);
  const [questionCountInput, setQuestionCountInput] = useState("");
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

  const startPracticeSession = async () => {
    if (!selectedSubject) {
      return;
    }

    try {
      setIsPreparing(true);
      setPrepareStatus("Checking offline availability...");
      const selectedYearForDownload = toNumericYear(selectedYear);
      const parsedQuestionCount = Number(questionCountInput);
      const questionCount =
        questionCountInput.trim().length > 0 &&
        Number.isFinite(parsedQuestionCount)
          ? parsedQuestionCount
          : undefined;
      const parsedTimeLimit = Number(timeLimitInput);
      const timeLimit =
        timeLimitInput.trim().length > 0 && Number.isFinite(parsedTimeLimit)
          ? parsedTimeLimit
          : undefined;

      const { downloadedNow } = await downloadMissingSubjects(
        [
          {
            id: selectedSubject.id,
            name: selectedSubject.name,
          },
        ],
        {
          year: selectedYearForDownload,
          onProgress: (progress) => {
            if (progress.phase === "checking") {
              setPrepareStatus(`Checking ${progress.subjectName}...`);
            }

            if (progress.phase === "downloading") {
              setPrepareStatus(`Downloading ${progress.subjectName}...`);
            }

            if (
              progress.phase === "page" &&
              progress.currentPage &&
              progress.lastPage
            ) {
              setPrepareStatus(
                `Downloading ${progress.subjectName}: page ${progress.currentPage}/${progress.lastPage}`,
              );
            }
          },
        },
      );

      setPrepareStatus("Starting practice session...");

      const quizzesResponse = await api.get("/quizzes", {
        params: {
          subject_id: selectedSubject.id,
        },
      });

      const quizzes = quizzesResponse.data?.data ?? [];

      if (!Array.isArray(quizzes) || quizzes.length === 0) {
        Alert.alert(
          "No quiz available",
          "No practice quiz is currently available for this subject.",
        );

        return;
      }

      const quizId = quizzes[0]?.id;

      if (!quizId) {
        Alert.alert(
          "Could not start",
          "Quiz could not be initialized right now. Please try again.",
        );

        return;
      }

      const startResponse = await api.post(`/quizzes/${quizId}/start`, {
        shuffle: shuffleQuestions,
        ...(questionCount ? { question_count: questionCount } : {}),
        ...(timeLimit ? { time_limit: timeLimit } : {}),
      });

      const attemptId = startResponse.data?.data?.attempt_id;

      if (downloadedNow.length > 0) {
        Alert.alert(
          "Practice started",
          `${selectedSubject.name} is ready. ${downloadedNow.length} subject pack downloaded.${attemptId ? ` Attempt #${attemptId} created.` : ""}`,
        );
      } else {
        Alert.alert(
          "Practice started",
          `${selectedSubject.name} is ready offline.${attemptId ? ` Attempt #${attemptId} created.` : ""}`,
        );
      }
    } catch (downloadError) {
      const message =
        downloadError instanceof Error
          ? downloadError.message
          : "Could not prepare subject download. Please try again.";

      Alert.alert("Preparation failed", message);
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
          Options
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
                onChangeText={setQuestionCountInput}
                keyboardType="number-pad"
                placeholder="All questions"
                placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
                className="flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-neutral-900 dark:text-neutral-100"
              />
              <Button
                variant="outline"
                size="sm"
                onPress={() => setQuestionCountInput("")}
              >
                Use All
              </Button>
            </View>
            <Caption className="text-neutral-500 dark:text-neutral-400">
              Leave blank to practice all available questions.
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
            <TextInput
              value={timeLimitInput}
              onChangeText={setTimeLimitInput}
              keyboardType="number-pad"
              placeholder="No limit"
              placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
              className="w-28 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-neutral-900 dark:text-neutral-100"
            />
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
                  Randomize question order
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

        <Button
          onPress={startPracticeSession}
          size="lg"
          loading={isPreparing}
          disabled={!selectedSubject || isPreparing}
          fullWidth
        >
          Start Practice Session
        </Button>
      </View>
    </View>
  );
}
