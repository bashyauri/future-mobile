import { useRouter } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";
import { useTheme } from "@/context/ThemeContext";
import { Card, Button } from "@/components";
import {
  Heading,
  Subheading,
  BodyText,
  Caption,
} from "@/components/Typography";
import api from "@/lib/api";

type ExamType = {
  id: number;
  name: string;
  slug?: string;
};

type Subject = {
  id: number;
  name: string;
  is_compulsory?: boolean;
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

function isCompulsoryEnglishSubject(subject: Subject): boolean {
  const normalizedName = subject.name.trim().toLowerCase();

  return (
    subject.is_compulsory === true ||
    normalizedName === "use of english" ||
    normalizedName === "english language" ||
    normalizedName === "english"
  );
}

const getSubjectIcon = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("english")) return "book-open-variant";
  if (n.includes("math")) return "calculator";
  if (n.includes("physics")) return "atom";
  if (n.includes("chemistry")) return "flask";
  if (n.includes("biology")) return "leaf";
  if (n.includes("economics")) return "chart-line";
  if (n.includes("commerce")) return "store";
  if (n.includes("government")) return "bank";
  if (n.includes("literature")) return "book-open-page-variant";
  if (n.includes("geography")) return "earth";
  if (n.includes("account")) return "cash";
  if (n.includes("agric")) return "sprout";
  return "school";
};

const getSubjectColor = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("english")) return "#3b82f6";
  if (n.includes("math")) return "#ef4444";
  if (n.includes("physics")) return "#8b5cf6";
  if (n.includes("chemistry")) return "#10b981";
  if (n.includes("biology")) return "#14b8a6";
  if (n.includes("economics")) return "#f59e0b";
  if (n.includes("commerce")) return "#f97316";
  if (n.includes("government")) return "#6366f1";
  if (n.includes("literature")) return "#ec4899";
  if (n.includes("geography")) return "#22c55e";
  return "#a855f7";
};

export default function JambSetupScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const netInfo = useNetInfo();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [questionsPerSubjectInput, setQuestionsPerSubjectInput] = useState("");
  const [timeLimitInput, setTimeLimitInput] = useState("");
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareStatus, setPrepareStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApplyingYearSelection, setIsApplyingYearSelection] = useState(false);
  const yearSelectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    const fetchJambConfiguration = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const examTypesResponse = await api.get("/config/exam-types");
        const examTypes: ExamType[] = examTypesResponse.data?.data ?? [];
        const jambExamType =
          examTypes.find((examType) => examType.slug === "jamb") ?? null;

        const [subjectsResponse, yearsResponse] = await Promise.all([
          api.get("/config/subjects", {
            params: jambExamType
              ? { exam_type_id: jambExamType.id }
              : undefined,
          }),
          api.get("/config/years", {
            params: jambExamType
              ? { exam_type_id: jambExamType.id }
              : undefined,
          }),
        ]);

        const fetchedSubjects: Subject[] =
          subjectsResponse.data?.data ?? subjectsResponse.data ?? [];
        const fetchedYears = normalizeYears(
          yearsResponse.data?.data ?? yearsResponse.data ?? [],
        );

        setSubjects(fetchedSubjects);
        setYears([{ year: "all", label: "All Years" }, ...fetchedYears]);
        setSelectedYear({ year: "all", label: "All Years" });

        const compulsory = fetchedSubjects
          .filter((subject) => isCompulsoryEnglishSubject(subject))
          .map((subject) => subject.id);

        setSelectedIds(compulsory);
      } catch (e) {
        setError("Could not load subjects. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJambConfiguration();
  }, []);

  const isRequired = (subject: Subject): boolean =>
    isCompulsoryEnglishSubject(subject);

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
    return () => {
      if (yearSelectionTimerRef.current) {
        clearTimeout(yearSelectionTimerRef.current);
      }
    };
  }, []);

  // Auto-refresh when connection is restored

  useEffect(() => {
    if (netInfo.isConnected === true && !isLoading) {
      const fetchJambConfiguration = async () => {
        try {
          setError(null);
          const examTypesResponse = await api.get("/config/exam-types");
          const examTypes: ExamType[] = examTypesResponse.data?.data ?? [];
          const jambExamType =
            examTypes.find((examType) => examType.slug === "jamb") ?? null;

          const [subjectsResponse, yearsResponse] = await Promise.all([
            api.get("/config/subjects", {
              params: jambExamType
                ? { exam_type_id: jambExamType.id }
                : undefined,
            }),
            api.get("/config/years", {
              params: jambExamType
                ? { exam_type_id: jambExamType.id }
                : undefined,
            }),
          ]);

          const fetchedSubjects: Subject[] =
            subjectsResponse.data?.data ?? subjectsResponse.data ?? [];
          const fetchedYears = normalizeYears(
            yearsResponse.data?.data ?? yearsResponse.data ?? [],
          );

          setSubjects(fetchedSubjects);
          setYears([{ year: "all", label: "All Years" }, ...fetchedYears]);
          setSelectedYear({ year: "all", label: "All Years" });

          const compulsory = fetchedSubjects
            .filter((subject) => isCompulsoryEnglishSubject(subject))
            .map((subject) => subject.id);

          setSelectedIds(compulsory);
        } catch (e) {
          setError("Could not load subjects. Please check your connection.");
        }
      };
      fetchJambConfiguration();
    }
  }, [netInfo.isConnected]);

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

  const startJambExam = async () => {
    const selectedSubjects = subjects.filter((subject) =>
      selectedIds.includes(subject.id),
    );

    if (selectedSubjects.length !== 4) {
      return;
    }

    try {
      setIsPreparing(true);
      setPrepareStatus("Validating JAMB session settings...");
      const selectedNumericYear = toNumericYear(selectedYear);
      const parsedQuestionsPerSubject = Number(questionsPerSubjectInput);
      const questionsPerSubject =
        questionsPerSubjectInput.trim().length > 0 &&
        Number.isFinite(parsedQuestionsPerSubject)
          ? parsedQuestionsPerSubject
          : undefined;
      const parsedTimeLimit = Number(timeLimitInput);
      const timeLimit =
        timeLimitInput.trim().length > 0 && Number.isFinite(parsedTimeLimit)
          ? parsedTimeLimit
          : undefined;

      await api.post("/jamb/sessions", {
        subject_ids: selectedSubjects.map((subject) => subject.id),
        year: selectedNumericYear ?? null,
        ...(questionsPerSubject
          ? { questions_per_subject: questionsPerSubject }
          : {}),
        ...(timeLimit ? { time_limit: timeLimit } : {}),
        shuffle: shuffleQuestions,
      });

      setPrepareStatus("Starting JAMB exam...");

      // Navigate to JAMB quiz screen with all settings as URL params,
      // mirroring the web's redirect to practice.jamb.quiz
      const queryParams = new URLSearchParams();
      queryParams.append(
        "subjects",
        selectedSubjects.map((s) => s.id).join(","),
      );
      if (selectedNumericYear) {
        queryParams.append("year", String(selectedNumericYear));
      }
      if (questionsPerSubject) {
        queryParams.append("questionsPerSubject", String(questionsPerSubject));
      }
      if (timeLimit) {
        queryParams.append("timeLimit", String(timeLimit));
      }
      queryParams.append("shuffle", shuffleQuestions ? "1" : "0");

      router.push(`/jamb/new?${queryParams.toString()}`);
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
          Loading subjects...
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
      {/* Header */}
      <View className="pt-16 pb-6 px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <Heading size="xl" className="mb-2">
          JAMB Exam
        </Heading>
        <BodyText className="text-neutral-500 dark:text-neutral-400">
          Select exactly 4 subjects to begin your standard JAMB mock
          examination.
        </BodyText>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <Subheading size="md" className="mb-3 px-2">
          Select Exam Year (Optional)
        </Subheading>
        {isApplyingYearSelection ? (
          <View className="flex-row items-center px-2 mb-3">
            <ActivityIndicator size="small" color="#4f46e5" />
            <Caption className="ml-2 text-neutral-500 dark:text-neutral-400">
              Applying year...
            </Caption>
          </View>
        ) : null}
        <View className="flex-row flex-wrap px-2 mb-6">
          {years.map((yearOption) => (
            <Button
              key={String(yearOption.year)}
              variant={
                selectedYear?.year === yearOption.year ? "primary" : "outline"
              }
              onPress={() => handleYearSelection(yearOption)}
              size="sm"
              style={{ marginRight: 12, marginBottom: 12 }}
            >
              {yearOption.label}
            </Button>
          ))}
        </View>

        <View className="flex-row justify-between items-end mb-4 px-2">
          <Subheading size="md">Available Subjects</Subheading>
          <Caption
            className={
              selectedIds.length === 4
                ? "text-success-500 font-bold"
                : "text-neutral-500"
            }
          >
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
                  className={`border-2 ${isSelected ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-transparent bg-white dark:bg-neutral-900"}`}
                >
                  <View className="flex-row justify-between items-start mb-3">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <MaterialCommunityIcons
                        name={icon as any}
                        size={20}
                        color={color}
                      />
                    </View>

                    {required ? (
                      <View className="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                        <Caption className="text-neutral-600 dark:text-neutral-400 text-[10px] font-bold">
                          REQ
                        </Caption>
                      </View>
                    ) : (
                      <View
                        className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                          isSelected
                            ? "bg-primary-500 border-primary-500"
                            : "border-neutral-300 dark:border-neutral-600"
                        }`}
                      >
                        {isSelected && (
                          <MaterialIcons name="check" size={14} color="white" />
                        )}
                      </View>
                    )}
                  </View>
                  <BodyText
                    className={`font-semibold ${isSelected ? "text-primary-900 dark:text-primary-100" : ""}`}
                  >
                    {subject.name}
                  </BodyText>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        <Subheading size="md" className="mb-3 px-2">
          Quiz Settings
        </Subheading>
        <Card
          variant="bordered"
          padding="md"
          className="mx-2 mb-4 bg-white dark:bg-neutral-900"
        >
          <View className="mb-4">
            <BodyText className="font-semibold mb-2">
              Questions per Subject
            </BodyText>
            <View className="flex-row items-center gap-2 mb-2">
              <TextInput
                value={questionsPerSubjectInput}
                onChangeText={setQuestionsPerSubjectInput}
                keyboardType="number-pad"
                placeholder="Default: 40"
                placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
                className="flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-neutral-900 dark:text-neutral-100"
              />
              <Button
                variant="outline"
                size="sm"
                onPress={() => setQuestionsPerSubjectInput("")}
              >
                Reset
              </Button>
            </View>
            <Caption className="text-neutral-500 dark:text-neutral-400">
              Leave blank for all available questions (default: 40 per subject).
            </Caption>
          </View>

          <View className="mb-4">
            <BodyText className="font-semibold mb-2">
              Time Limit (minutes)
            </BodyText>
            <View className="flex-row items-center gap-2 mb-2">
              <TextInput
                value={timeLimitInput}
                onChangeText={setTimeLimitInput}
                keyboardType="number-pad"
                placeholder="No time limit"
                placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
                className="flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-neutral-900 dark:text-neutral-100"
              />
              <Button
                variant="outline"
                size="sm"
                onPress={() => setTimeLimitInput("")}
              >
                No Limit
              </Button>
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
                <Caption className="text-neutral-500 dark:text-neutral-400">
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

        <Card
          variant="bordered"
          padding="md"
          className="mx-2 mb-28 bg-white dark:bg-neutral-900"
        >
          <Subheading size="sm" className="mb-3">
            Test Summary
          </Subheading>
          <View className="flex-row justify-between items-center mb-2">
            <Caption className="text-neutral-500 dark:text-neutral-400">
              Questions/Subject
            </Caption>
            <BodyText className="font-semibold text-primary-600 dark:text-primary-400">
              {questionsPerSubjectInput || "All"}
            </BodyText>
          </View>
          <View className="flex-row justify-between items-center mb-2">
            <Caption className="text-neutral-500 dark:text-neutral-400">
              Total Questions
            </Caption>
            <BodyText className="font-semibold text-primary-600 dark:text-primary-400">
              {questionsPerSubjectInput
                ? `${Number(questionsPerSubjectInput || 0) * 4}`
                : "All available"}
            </BodyText>
          </View>
          <View className="flex-row justify-between items-center">
            <Caption className="text-neutral-500 dark:text-neutral-400">
              Time Limit
            </Caption>
            <BodyText className="font-semibold text-primary-600 dark:text-primary-400">
              {timeLimitInput ? `${timeLimitInput} mins` : "Unlimited"}
            </BodyText>
          </View>
        </Card>
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
          disabled={selectedIds.length !== 4 || isPreparing}
          loading={isPreparing}
          onPress={startJambExam}
          size="lg"
          fullWidth
        >
          {selectedIds.length === 4
            ? "Start JAMB Exam"
            : `Select ${4 - selectedIds.length} more`}
        </Button>
      </View>
    </View>
  );
}
