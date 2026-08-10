import { useFocusEffect, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
} from "react-native";

import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@/context/ThemeContext";

import {
  useSubscriptionGuard,
  SubscriptionGuardView,
} from "@/lib/useSubscriptionGuard";

import { Card, Button } from "@/components";

import {
  Heading,
  Subheading,
  BodyText,
  Caption,
} from "@/components/Typography";

import api from "@/lib/api";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const ALL_YEARS: Year = {
  year: "all",
  label: "All Years",
};

const REQUEST_TIMEOUT = 15000;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function normalizeYears(input: unknown): Year[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (
        typeof item === "number" ||
        typeof item === "string"
      ) {
        return {
          year: item,
          label: String(item),
        };
      }

      if (item && typeof item === "object") {
        const maybeYear = (
          item as { year?: number | string }
        ).year;

        const maybeLabel = (
          item as { label?: string }
        ).label;

        if (maybeYear !== undefined) {
          return {
            year: maybeYear,
            label:
              maybeLabel ?? String(maybeYear),
          };
        }
      }

      return null;
    })
    .filter(
      (item): item is Year =>
        Boolean(item),
    );
}

function toNumericYear(
  selectedYear: Year | null,
): number | undefined {
  if (
    !selectedYear ||
    selectedYear.year === "all"
  ) {
    return undefined;
  }

  const parsedYear = Number(
    selectedYear.year,
  );

  return Number.isFinite(parsedYear)
    ? parsedYear
    : undefined;
}

function getRelativeTime(
  dateString: string,
): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const diffMs =
    now.getTime() - date.getTime();

  const diffMins = Math.floor(
    diffMs / 60000,
  );

  const diffHours = Math.floor(
    diffMs / 3600000,
  );

  const diffDays = Math.floor(
    diffMs / 86400000,
  );

  if (diffMins < 1) {
    return "just now";
  }

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? "s" : ""
      } ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""
      } ago`;
  }

  return `${diffDays} day${diffDays > 1 ? "s" : ""
    } ago`;
}

// -----------------------------------------------------------------------------
// Screen
// -----------------------------------------------------------------------------

export default function PracticeSetupScreen() {
  const { theme } = useTheme();

  const isDark = theme === "dark";

  const router = useRouter();

  const netInfo = useNetInfo();

  // ---------------------------------------------------------------------------
  // Subscription
  // ---------------------------------------------------------------------------

  const {
    isAllowed,
    isChecking,
  } = useSubscriptionGuard({
    requirePaidOnly: true,
  });

  // ---------------------------------------------------------------------------
  // API data
  // ---------------------------------------------------------------------------

  const [examTypes, setExamTypes] =
    useState<ExamType[]>([]);

  const [subjects, setSubjects] =
    useState<Subject[]>([]);

  const [years, setYears] =
    useState<Year[]>([ALL_YEARS]);

  const [activeAttempts, setActiveAttempts] =
    useState<ActiveAttempt[]>([]);

  // ---------------------------------------------------------------------------
  // User selections
  // ---------------------------------------------------------------------------

  const [selectedExamType, setSelectedExamType] =
    useState<ExamType | null>(null);

  const [selectedSubject, setSelectedSubject] =
    useState<Subject | null>(null);

  const [selectedYear, setSelectedYear] =
    useState<Year | null>(ALL_YEARS);

  const [
    questionCountInput,
    setQuestionCountInput,
  ] = useState("");

  const [
    questionCountError,
    setQuestionCountError,
  ] = useState<string | null>(null);

  const [
    timeLimitInput,
    setTimeLimitInput,
  ] = useState("");

  const [
    shuffleQuestions,
    setShuffleQuestions,
  ] = useState(false);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  const [
    isLoadingConfig,
    setIsLoadingConfig,
  ] = useState(true);

  const [
    isLoadingYears,
    setIsLoadingYears,
  ] = useState(false);

  const [
    isLoadingQuestionCount,
    setIsLoadingQuestionCount,
  ] = useState(false);

  const [
    isLoadingAttempts,
    setIsLoadingAttempts,
  ] = useState(false);

  const [
    isPreparing,
    setIsPreparing,
  ] = useState(false);

  const [
    prepareStatus,
    setPrepareStatus,
  ] = useState<string | null>(null);

  const [
    isApplyingYearSelection,
    setIsApplyingYearSelection,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [
    availableQuestionCount,
    setAvailableQuestionCount,
  ] = useState<number | null>(null);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------

  const mountedRef = useRef(true);

  const configRequestIdRef = useRef(0);

  const yearsRequestIdRef = useRef(0);

  const questionCountRequestIdRef =
    useRef(0);

  const yearSelectionTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const previousConnectionRef =
    useRef<boolean | null>(null);

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      mountedRef.current = false;

      if (yearSelectionTimerRef.current) {
        clearTimeout(
          yearSelectionTimerRef.current,
        );
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Load main configuration
  // ---------------------------------------------------------------------------

  const loadConfiguration = useCallback(
    async (options?: {
      showLoader?: boolean;
      preserveSelection?: boolean;
    }) => {
      if (!isAllowed || isChecking) {
        return;
      }

      const showLoader =
        options?.showLoader ?? true;

      const preserveSelection =
        options?.preserveSelection ?? true;

      const requestId =
        ++configRequestIdRef.current;

      try {
        if (mountedRef.current) {
          if (showLoader) {
            setIsLoadingConfig(true);
          }

          setError(null);
        }

        console.log(
          "PRACTICE: Loading configuration...",
        );

        const [
          subjectsRes,
          examTypesRes,
          attemptsRes,
        ] = await Promise.all([
          api.get("/config/subjects", {
            timeout: REQUEST_TIMEOUT,
          }),

          api.get("/config/exam-types", {
            timeout: REQUEST_TIMEOUT,
          }),

          api
            .get(
              "/practice/active-attempts",
              {
                timeout: REQUEST_TIMEOUT,
              },
            )
            .catch((error) => {
              console.warn(
                "PRACTICE: Failed to load active attempts:",
                error,
              );

              return null;
            }),
        ]);

        if (
          !mountedRef.current ||
          requestId !==
          configRequestIdRef.current
        ) {
          return;
        }

        const fetchedSubjects: Subject[] =
          subjectsRes.data?.data ??
          subjectsRes.data ??
          [];

        const fetchedExamTypes: ExamType[] =
          examTypesRes.data?.data ??
          examTypesRes.data ??
          [];

        const fetchedAttempts: ActiveAttempt[] =
          attemptsRes?.data?.attempts ??
          [];

        setSubjects(fetchedSubjects);

        setExamTypes(fetchedExamTypes);

        setActiveAttempts(
          fetchedAttempts,
        );

        // ---------------------------------------------------------------------
        // Preserve existing subject when refreshing.
        // Only select the first subject when there isn't one.
        // ---------------------------------------------------------------------

        setSelectedSubject(
          (previous) => {
            if (
              preserveSelection &&
              previous
            ) {
              const stillExists =
                fetchedSubjects.some(
                  (subject) =>
                    subject.id ===
                    previous.id,
                );

              if (stillExists) {
                return previous;
              }
            }

            return (
              fetchedSubjects[0] ??
              null
            );
          },
        );

        // ---------------------------------------------------------------------
        // Preserve exam type when possible.
        // ---------------------------------------------------------------------

        setSelectedExamType(
          (previous) => {
            if (
              preserveSelection &&
              previous
            ) {
              const stillExists =
                fetchedExamTypes.some(
                  (examType) =>
                    examType.id ===
                    previous.id,
                );

              if (stillExists) {
                return previous;
              }
            }

            return null;
          },
        );

        // ---------------------------------------------------------------------
        // Don't reset user's year during a background refresh.
        // ---------------------------------------------------------------------

        if (!preserveSelection) {
          setSelectedYear(
            ALL_YEARS,
          );
        }

        console.log(
          "PRACTICE: Configuration loaded.",
        );
      } catch (e: any) {
        if (
          !mountedRef.current ||
          requestId !==
          configRequestIdRef.current
        ) {
          return;
        }

        console.error(
          "PRACTICE CONFIG ERROR:",
          e?.response?.data ?? e,
        );

        setError(
          "Could not load configuration. Please check your connection and try again.",
        );
      } finally {
        if (
          mountedRef.current &&
          requestId ===
          configRequestIdRef.current
        ) {
          if (showLoader) {
            setIsLoadingConfig(false);
          }
        }
      }
    },
    [isAllowed, isChecking],
  );

  // ---------------------------------------------------------------------------
  // Initial configuration load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isChecking) {
      return;
    }

    if (!isAllowed) {
      setIsLoadingConfig(false);
      return;
    }

    loadConfiguration({
      showLoader: true,
      preserveSelection: false,
    });
  }, [
    isAllowed,
    isChecking,
    loadConfiguration,
  ]);

  // ---------------------------------------------------------------------------
  // Refresh active attempts when screen receives focus
  // ---------------------------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      if (
        !isAllowed ||
        isChecking ||
        !mountedRef.current
      ) {
        return;
      }

      let cancelled = false;

      const refreshAttempts =
        async () => {
          try {
            setIsLoadingAttempts(true);

            const response =
              await api.get(
                "/practice/active-attempts",
                {
                  timeout:
                    REQUEST_TIMEOUT,
                },
              );

            if (cancelled) {
              return;
            }

            setActiveAttempts(
              response.data?.attempts ??
              [],
            );
          } catch (e) {
            if (!cancelled) {
              console.warn(
                "PRACTICE: Failed to refresh active attempts:",
                e,
              );
            }
          } finally {
            if (!cancelled) {
              setIsLoadingAttempts(
                false,
              );
            }
          }
        };

      refreshAttempts();

      return () => {
        cancelled = true;
      };
    }, [
      isAllowed,
      isChecking,
    ]),
  );

  // ---------------------------------------------------------------------------
  // Network restoration
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const currentConnection =
      netInfo.isConnected === true;

    const previousConnection =
      previousConnectionRef.current;

    previousConnectionRef.current =
      netInfo.isConnected;

    // First render.
    if (
      previousConnection === null
    ) {
      return;
    }

    // We only care about:
    //
    // OFFLINE → ONLINE
    //
    const connectionRestored =
      previousConnection === false &&
      currentConnection === true;

    if (!connectionRestored) {
      return;
    }

    if (
      !isAllowed ||
      isChecking
    ) {
      return;
    }

    console.log(
      "PRACTICE: Network restored. Refreshing...",
    );

    loadConfiguration({
      showLoader: false,
      preserveSelection: true,
    });
  }, [
    netInfo.isConnected,
    isAllowed,
    isChecking,
    loadConfiguration,
  ]);

  // ---------------------------------------------------------------------------
  // Load years for subject + exam type
  // ---------------------------------------------------------------------------

  const loadYears = useCallback(
    async (
      subjectId?: number,
      examTypeId?: number,
    ) => {
      const requestId =
        ++yearsRequestIdRef.current;

      if (!subjectId || !examTypeId) {
        if (!mountedRef.current) {
          return;
        }

        setYears([ALL_YEARS]);
        setSelectedYear(ALL_YEARS);
        setIsLoadingYears(false);

        return;
      }

      try {
        setIsLoadingYears(true);

        const response =
          await api.get(
            "/config/years",
            {
              params: {
                subject_id:
                  subjectId,

                exam_type_id:
                  examTypeId,
              },

              timeout:
                REQUEST_TIMEOUT,
            },
          );

        if (
          !mountedRef.current ||
          requestId !==
          yearsRequestIdRef.current
        ) {
          return;
        }

        const fetchedYears =
          normalizeYears(
            response.data?.data ??
            response.data ??
            [],
          );

        setYears([
          ALL_YEARS,
          ...fetchedYears,
        ]);

        // Preserve selected year if still available.
        setSelectedYear(
          (previous) => {
            if (!previous) {
              return ALL_YEARS;
            }

            if (
              previous.year === "all"
            ) {
              return ALL_YEARS;
            }

            const exists =
              fetchedYears.some(
                (yearOption) =>
                  String(
                    yearOption.year,
                  ) ===
                  String(
                    previous.year,
                  ),
              );

            return exists
              ? previous
              : ALL_YEARS;
          },
        );
      } catch (e: any) {
        if (
          !mountedRef.current ||
          requestId !==
          yearsRequestIdRef.current
        ) {
          return;
        }

        console.warn(
          "PRACTICE: Failed to load years:",
          e?.response?.data ?? e,
        );

        setYears([ALL_YEARS]);
        setSelectedYear(ALL_YEARS);
      } finally {
        if (
          mountedRef.current &&
          requestId ===
          yearsRequestIdRef.current
        ) {
          setIsLoadingYears(false);
        }
      }
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Load years when subject/exam type changes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (
      !selectedSubject ||
      !selectedExamType
    ) {
      setYears([ALL_YEARS]);
      setSelectedYear(ALL_YEARS);
      return;
    }

    loadYears(
      selectedSubject.id,
      selectedExamType.id,
    );
  }, [
    selectedSubject,
    selectedExamType,
    loadYears,
  ]);

  // ---------------------------------------------------------------------------
  // Load available question count
  // ---------------------------------------------------------------------------

  const loadQuestionCount =
    useCallback(
      async (
        subjectId?: number,
        examTypeId?: number,
        year?: number | string,
      ) => {
        const requestId =
          ++questionCountRequestIdRef.current;

        if (!subjectId) {
          setAvailableQuestionCount(
            null,
          );
          setIsLoadingQuestionCount(
            false,
          );
          return;
        }

        try {
          setIsLoadingQuestionCount(
            true,
          );

          const params: Record<
            string,
            number
          > = {
            subject_id: subjectId,
          };

          if (examTypeId) {
            params.exam_type_id =
              examTypeId;
          }

          if (
            year &&
            year !== "all"
          ) {
            const numericYear =
              Number(year);

            if (
              Number.isFinite(
                numericYear,
              )
            ) {
              params.year =
                numericYear;
            }
          }

          const response =
            await api.get(
              "/practice/question-count",
              {
                params,
                timeout:
                  REQUEST_TIMEOUT,
              },
            );

          if (
            !mountedRef.current ||
            requestId !==
            questionCountRequestIdRef.current
          ) {
            return;
          }

          setAvailableQuestionCount(
            response.data?.count ??
            null,
          );
        } catch (e: any) {
          if (
            !mountedRef.current ||
            requestId !==
            questionCountRequestIdRef.current
          ) {
            return;
          }

          console.warn(
            "PRACTICE: Failed to load question count:",
            e?.response?.data ?? e,
          );

          setAvailableQuestionCount(
            null,
          );
        } finally {
          if (
            mountedRef.current &&
            requestId ===
            questionCountRequestIdRef.current
          ) {
            setIsLoadingQuestionCount(
              false,
            );
          }
        }
      },
      [],
    );

  // ---------------------------------------------------------------------------
  // Question count when selection changes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    loadQuestionCount(
      selectedSubject?.id,
      selectedExamType?.id,
      selectedYear?.year,
    );
  }, [
    selectedSubject,
    selectedExamType,
    selectedYear,
    loadQuestionCount,
  ]);

  // ---------------------------------------------------------------------------
  // Selected attempt
  // ---------------------------------------------------------------------------

  const matchingAttempt =
    useMemo(() => {
      if (!selectedSubject) {
        return null;
      }

      return (
        activeAttempts.find(
          (attempt) => {
            const subjectMatch =
              attempt.subject_id ===
              selectedSubject.id;

            const examTypeMatch =
              !selectedExamType ||
              attempt.exam_type_id ===
              selectedExamType.id;

            const yearMatch =
              !selectedYear ||
              selectedYear.year ===
              "all" ||
              attempt.exam_year ===
              Number(
                selectedYear.year,
              );

            return (
              subjectMatch &&
              examTypeMatch &&
              yearMatch
            );
          },
        ) ?? null
      );
    }, [
      activeAttempts,
      selectedSubject,
      selectedExamType,
      selectedYear,
    ]);

  // ---------------------------------------------------------------------------
  // Year selection
  // ---------------------------------------------------------------------------

  const handleYearSelection =
    useCallback(
      (yearOption: Year) => {
        setSelectedYear(
          yearOption,
        );

        setIsApplyingYearSelection(
          true,
        );

        if (
          yearSelectionTimerRef.current
        ) {
          clearTimeout(
            yearSelectionTimerRef.current,
          );
        }

        yearSelectionTimerRef.current =
          setTimeout(() => {
            if (
              mountedRef.current
            ) {
              setIsApplyingYearSelection(
                false,
              );
            }
          }, 300);
      },
      [],
    );

  // ---------------------------------------------------------------------------
  // Resume attempt
  // ---------------------------------------------------------------------------

  const resumeAttempt =
    useCallback(
      async (attemptId: number) => {
        try {
          setIsPreparing(true);

          setPrepareStatus(
            "Resuming practice session...",
          );

          const response =
            await api.get(
              `/practice/load/${attemptId}`,
              {
                timeout:
                  REQUEST_TIMEOUT,
              },
            );

          const attemptData =
            response.data;

          await storage.setItem(
            `practice_attempt_${attemptId}`,
            JSON.stringify(
              attemptData,
            ),
          );

          router.push(
            `/practice/${attemptId}`,
          );
        } catch (error: any) {
          Alert.alert(
            "Failed to Resume",
            error?.response
              ?.data?.message ??
            error?.message ??
            "Unknown error",
          );
        } finally {
          if (mountedRef.current) {
            setIsPreparing(false);
            setPrepareStatus(null);
          }
        }
      },
      [router],
    );

  // ---------------------------------------------------------------------------
  // Perform dismiss
  // ---------------------------------------------------------------------------

  const performDismiss =
    useCallback(
      async (attemptId: number) => {
        try {
          await api.delete(
            `/practice/attempts/${attemptId}`,
          );

          if (!mountedRef.current) {
            return;
          }

          setActiveAttempts(
            (previous) =>
              previous.filter(
                (attempt) =>
                  attempt.id !==
                  attemptId,
              ),
          );
        } catch (error: any) {
          Alert.alert(
            "Failed to Dismiss",
            error?.response
              ?.data?.message ??
            error?.message ??
            "Unknown error",
          );
        }
      },
      [],
    );

  // ---------------------------------------------------------------------------
  // Dismiss attempt
  // ---------------------------------------------------------------------------

  const dismissAttempt =
    useCallback(
      async (attemptId: number) => {
        if (Platform.OS === "web") {
          const confirmed =
            window.confirm(
              "Are you sure you want to dismiss this practice session?",
            );

          if (!confirmed) {
            return;
          }

          await performDismiss(
            attemptId,
          );

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
              onPress: () =>
                performDismiss(
                  attemptId,
                ),
            },
          ],
        );
      },
      [performDismiss],
    );

  // ---------------------------------------------------------------------------
  // Start practice
  // ---------------------------------------------------------------------------

  const startPracticeSession =
    useCallback(async () => {
      const questionCount =
        questionCountInput.trim() !== ""
          ? Number(
            questionCountInput,
          )
          : undefined;

      const timeLimit =
        timeLimitInput.trim() !== ""
          ? Number(
            timeLimitInput,
          )
          : undefined;

      // -----------------------------------------------------------------------
      // Validation
      // -----------------------------------------------------------------------

      if (
        questionCount !==
        undefined &&
        (!Number.isFinite(
          questionCount,
        ) ||
          questionCount <= 0)
      ) {
        Alert.alert(
          "Invalid Question Count",
          "Enter a value greater than 0.",
        );

        return;
      }

      if (
        availableQuestionCount !==
        null &&
        questionCount !==
        undefined &&
        questionCount >
        availableQuestionCount
      ) {
        Alert.alert(
          "Too Many Questions",
          `Only ${availableQuestionCount} questions are available for the selected options.`,
        );

        return;
      }

      if (
        timeLimit !== undefined &&
        (!Number.isFinite(
          timeLimit,
        ) ||
          timeLimit <= 0)
      ) {
        Alert.alert(
          "Invalid Time Limit",
          "Enter a value greater than 0.",
        );

        return;
      }

      if (!selectedSubject) {
        Alert.alert(
          "Subject Required",
          "Please select a subject.",
        );

        return;
      }

      try {
        setIsPreparing(true);

        setPrepareStatus(
          "Creating practice session...",
        );

        const payload = {
          subject:
            selectedSubject.id,

          exam_type:
            selectedExamType?.id,

          year: toNumericYear(
            selectedYear,
          ),

          limit: questionCount,

          time: timeLimit,

          shuffle:
            shuffleQuestions,
        };

        console.log(
          "PRACTICE: Starting session:",
          payload,
        );

        const response =
          await api.post(
            "/practice/start",
            payload,
            {
              timeout:
                REQUEST_TIMEOUT,
            },
          );

        const attemptData =
          response.data?.data ??
          response.data;

        if (
          !attemptData?.attempt_id
        ) {
          throw new Error(
            "Practice session created but no attempt ID was returned.",
          );
        }

        await storage.setItem(
          `practice_attempt_${attemptData.attempt_id}`,
          JSON.stringify(
            attemptData,
          ),
        );

        router.push(
          `/practice/${attemptData.attempt_id}`,
        );
      } catch (error: any) {
        Alert.alert(
          "Failed to Start Practice",
          error?.response
            ?.data?.message ??
          error?.message ??
          "Unknown error",
        );
      } finally {
        if (mountedRef.current) {
          setIsPreparing(false);
          setPrepareStatus(null);
        }
      }
    }, [
      questionCountInput,
      timeLimitInput,
      availableQuestionCount,
      selectedSubject,
      selectedExamType,
      selectedYear,
      shuffleQuestions,
      router,
    ]);

  // ---------------------------------------------------------------------------
  // Input validation
  // ---------------------------------------------------------------------------

  const handleQuestionCountChange =
    useCallback(
      (text: string) => {
        setQuestionCountInput(
          text,
        );

        if (!text.trim()) {
          setQuestionCountError(
            null,
          );

          return;
        }

        const count = Number(text);

        if (
          !Number.isFinite(count) ||
          count <= 0
        ) {
          setQuestionCountError(
            "Enter a value greater than 0",
          );

          return;
        }

        if (
          availableQuestionCount !==
          null &&
          count >
          availableQuestionCount
        ) {
          setQuestionCountError(
            `Only ${availableQuestionCount} questions available`,
          );

          return;
        }

        setQuestionCountError(
          null,
        );
      },
      [availableQuestionCount],
    );

  // ===========================================================================
  // RENDERING
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // 1. Authentication/subscription is still being resolved
  // ---------------------------------------------------------------------------

  if (isChecking) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-8">
        <ActivityIndicator
          size="large"
          color="#4f46e5"
        />

        <BodyText className="mt-4 text-center text-neutral-500 dark:text-neutral-400">
          Checking your subscription...
        </BodyText>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Subscription required
  // ---------------------------------------------------------------------------

  if (!isAllowed) {
    return (
      <SubscriptionGuardView
        featureName="Practice Mode"
      />
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Configuration loading
  // ---------------------------------------------------------------------------

  if (isLoadingConfig) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-8">
        <ActivityIndicator
          size="large"
          color="#4f46e5"
        />

        <BodyText className="mt-4 text-center text-neutral-500 dark:text-neutral-400">
          Loading practice options...
        </BodyText>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Configuration error
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-8">
        <MaterialIcons
          name="cloud-off"
          size={48}
          color="#a1a1aa"
        />

        <BodyText className="mt-4 text-center text-neutral-500 dark:text-neutral-400">
          {error}
        </BodyText>

        <Button
          variant="primary"
          className="mt-6"
          onPress={() =>
            loadConfiguration({
              showLoader: true,
              preserveSelection: true,
            })
          }
        >
          Try Again
        </Button>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // 5. Main UI
  // ---------------------------------------------------------------------------

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* ------------------------------------------------------------------- */}
      {/* Header */}
      {/* ------------------------------------------------------------------- */}

      <View className="pt-16 pb-6 px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <Heading
          size="xl"
          className="mb-2"
        >
          Practice Mode
        </Heading>

        <BodyText className="text-neutral-900 dark:text-neutral-400">
          Focus on specific subjects and
          past questions to sharpen your
          skills at your own pace.
        </BodyText>
      </View>

      {/* ------------------------------------------------------------------- */}
      {/* Content */}
      {/* ------------------------------------------------------------------- */}

      <ScrollView
        className="flex-1 px-4 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 140,
        }}
      >
        {/* --------------------------------------------------------------- */}
        {/* Active Attempts */}
        {/* --------------------------------------------------------------- */}

        {activeAttempts.length > 0 && (
          <>
            <Subheading
              size="md"
              className="mb-3 px-2"
            >
              Resume In-Progress Quizzes
            </Subheading>

            {isLoadingAttempts ? (
              <View className="flex-row items-center px-2 mb-6">
                <ActivityIndicator
                  size="small"
                  color="#4f46e5"
                />

                <Caption className="ml-2 text-neutral-500 dark:text-neutral-400">
                  Loading in-progress
                  quizzes...
                </Caption>
              </View>
            ) : (
              <View className="mb-6">
                {activeAttempts.map(
                  (attempt) => (
                    <Card
                      key={attempt.id}
                      variant="bordered"
                      padding="md"
                      className="mb-3 bg-white dark:bg-neutral-900"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <BodyText className="font-semibold mb-1">
                            {
                              attempt.subject_name
                            }
                          </BodyText>

                          <View className="flex-row items-center gap-2 mb-1">
                            {attempt.exam_type_name && (
                              <Caption className="text-neutral-500 dark:text-neutral-400">
                                {
                                  attempt.exam_type_name
                                }
                              </Caption>
                            )}

                            {attempt.exam_year && (
                              <Caption className="text-neutral-500 dark:text-neutral-400">
                                •{" "}
                                {
                                  attempt.exam_year
                                }
                              </Caption>
                            )}
                          </View>

                          <View className="flex-row items-center gap-2">
                            <Caption className="text-neutral-500 dark:text-neutral-400">
                              {attempt.current_question_index +
                                1}{" "}
                              /{" "}
                              {
                                attempt.total_questions
                              }{" "}
                              questions
                            </Caption>

                            {attempt.is_timed && (
                              <View className="px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30">
                                <Caption className="text-primary-700 dark:text-primary-300 text-xs">
                                  Timed
                                </Caption>
                              </View>
                            )}
                          </View>

                          {attempt.started_at ? (
                            <Caption className="mt-1 text-neutral-400">
                              Started{" "}
                              {getRelativeTime(
                                attempt.started_at,
                              )}
                            </Caption>
                          ) : null}
                        </View>

                        <View className="flex-row gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onPress={() =>
                              dismissAttempt(
                                attempt.id,
                              )
                            }
                          >
                            Dismiss
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            onPress={() =>
                              resumeAttempt(
                                attempt.id,
                              )
                            }
                          >
                            Resume
                          </Button>
                        </View>
                      </View>
                    </Card>
                  ),
                )}
              </View>
            )}
          </>
        )}

        {/* --------------------------------------------------------------- */}
        {/* Subject */}
        {/* --------------------------------------------------------------- */}

        <Subheading
          size="md"
          className="mb-3 px-2"
        >
          Select Subject
        </Subheading>

        {subjects.length === 0 ? (
          <Card
            variant="bordered"
            padding="md"
            className="mb-6 bg-white dark:bg-neutral-900"
          >
            <Caption className="text-neutral-500 dark:text-neutral-400">
              No subjects are currently
              available.
            </Caption>
          </Card>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            className="mb-8 pl-2"
          >
            {subjects.map(
              (subject) => (
                <TouchableOpacity
                  key={subject.id}
                  activeOpacity={0.7}
                  onPress={() =>
                    setSelectedSubject(
                      subject,
                    )
                  }
                  className={`mr-3 px-5 py-3 rounded-full border-2 ${selectedSubject?.id ===
                      subject.id
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                    }`}
                >
                  <BodyText
                    className={`font-medium ${selectedSubject?.id ===
                        subject.id
                        ? "text-primary-600 dark:text-primary-400"
                        : ""
                      }`}
                  >
                    {
                      subject.name
                    }
                  </BodyText>
                </TouchableOpacity>
              ),
            )}

            <View className="w-4" />
          </ScrollView>
        )}

        {/* --------------------------------------------------------------- */}
        {/* Exam Type */}
        {/* --------------------------------------------------------------- */}

        <Subheading
          size="md"
          className="mb-3 px-2"
        >
          Select Exam Type (Optional)
        </Subheading>

        <View className="flex-row flex-wrap px-2 mb-6">
          <Button
            onPress={() => {
              setSelectedExamType(
                null,
              );

              setSelectedYear(
                ALL_YEARS,
              );
            }}
            variant={
              selectedExamType ===
                null
                ? "primary"
                : "outline"
            }
            size="sm"
            style={{
              marginRight: 12,
              marginBottom: 12,
            }}
          >
            All Exam Types
          </Button>

          {examTypes.map(
            (examType) => (
              <Button
                key={examType.id}
                onPress={() => {
                  setSelectedExamType(
                    examType,
                  );

                  setSelectedYear(
                    ALL_YEARS,
                  );
                }}
                variant={
                  selectedExamType?.id ===
                    examType.id
                    ? "primary"
                    : "outline"
                }
                size="sm"
                style={{
                  marginRight: 12,
                  marginBottom: 12,
                }}
              >
                {examType.name}
              </Button>
            ),
          )}
        </View>

        {/* --------------------------------------------------------------- */}
        {/* Years */}
        {/* --------------------------------------------------------------- */}

        <Subheading
          size="md"
          className="mb-3 px-2"
        >
          Select Year
        </Subheading>

        {isLoadingYears ||
          isApplyingYearSelection ? (
          <View className="flex-row items-center px-2 mb-3">
            <ActivityIndicator
              size="small"
              color="#4f46e5"
            />

            <Caption className="ml-2 text-neutral-500 dark:text-neutral-400">
              {isLoadingYears
                ? "Loading years..."
                : "Applying year..."}
            </Caption>
          </View>
        ) : null}

        <View className="flex-row flex-wrap px-2 mb-6">
          {years.map((yearOption) => (
            <Button
              key={String(
                yearOption.year,
              )}
              onPress={() =>
                handleYearSelection(
                  yearOption,
                )
              }
              variant={
                selectedYear?.year ===
                  yearOption.year
                  ? "primary"
                  : "outline"
              }
              disabled={
                !selectedSubject ||
                !selectedExamType ||
                isLoadingYears
              }
              size="sm"
              style={{
                marginRight: 12,
                marginBottom: 12,
              }}
            >
              {yearOption.label}
            </Button>
          ))}
        </View>

        {!selectedExamType ? (
          <Caption className="px-2 mb-6 text-neutral-500 dark:text-neutral-400">
            Select an exam type to choose
            a specific year. Otherwise, all
            years will be used.
          </Caption>
        ) : null}

        {/* --------------------------------------------------------------- */}
        {/* Practice Settings */}
        {/* --------------------------------------------------------------- */}

        <Subheading
          size="md"
          className="mb-3 px-2"
        >
          Practice Settings
        </Subheading>

        <Card
          variant="bordered"
          padding="md"
          className="mb-6 bg-white dark:bg-neutral-900"
        >
          {/* ------------------------------------------------------------- */}
          {/* Question Count */}
          {/* ------------------------------------------------------------- */}

          <View className="mb-4">
            <BodyText className="font-semibold mb-2">
              Question Count
            </BodyText>

            <View className="flex-row items-center gap-2 mb-2">
              <TextInput
                value={
                  questionCountInput
                }
                onChangeText={
                  handleQuestionCountChange
                }
                keyboardType="number-pad"
                placeholder="All questions"
                placeholderTextColor={
                  isDark
                    ? "#71717a"
                    : "#a1a1aa"
                }
                className={`flex-1 rounded-xl border px-3 py-2 text-neutral-900 dark:text-neutral-100 ${questionCountError
                    ? "border-red-500"
                    : "border-neutral-300 dark:border-neutral-700"
                  } bg-white dark:bg-neutral-900`}
              />

              {availableQuestionCount !==
                null &&
                availableQuestionCount >
                0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      setQuestionCountInput(
                        "",
                      );

                      setQuestionCountError(
                        null,
                      );
                    }}
                  >
                    Use All (
                    {
                      availableQuestionCount
                    }
                    )
                  </Button>
                )}
            </View>

            {questionCountError ? (
              <Caption className="text-red-600 dark:text-red-400 mb-2">
                {
                  questionCountError
                }
              </Caption>
            ) : null}

            <Caption className="text-neutral-500 dark:text-neutral-400">
              {isLoadingQuestionCount
                ? "Loading available questions..."
                : availableQuestionCount !==
                  null
                  ? `${availableQuestionCount} questions available`
                  : "Leave blank to practice all available questions."}
            </Caption>
          </View>

          {/* ------------------------------------------------------------- */}
          {/* Time Limit */}
          {/* ------------------------------------------------------------- */}

          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1 pr-4">
              <View className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center mr-3">
                <MaterialIcons
                  name="timer"
                  size={20}
                  color={
                    isDark
                      ? "#a1a1aa"
                      : "#52525b"
                  }
                />
              </View>

              <View>
                <BodyText className="font-semibold mb-1">
                  Time Limit
                </BodyText>

                <Caption className="text-neutral-900 dark:text-neutral-400">
                  Leave blank for
                  untimed practice
                </Caption>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              <TextInput
                value={
                  timeLimitInput
                }
                onChangeText={
                  setTimeLimitInput
                }
                keyboardType="number-pad"
                placeholder="No limit"
                placeholderTextColor={
                  isDark
                    ? "#71717a"
                    : "#a1a1aa"
                }
                className="w-28 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-neutral-900 dark:text-neutral-100"
              />

              {timeLimitInput ? (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() =>
                    setTimeLimitInput(
                      "",
                    )
                  }
                >
                  No Limit
                </Button>
              ) : null}
            </View>
          </View>

          {/* ------------------------------------------------------------- */}
          {/* Shuffle */}
          {/* ------------------------------------------------------------- */}

          <View className="flex-row items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-4">
            <View className="flex-row items-center flex-1 pr-4">
              <View className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center mr-3">
                <MaterialIcons
                  name="shuffle"
                  size={20}
                  color={
                    isDark
                      ? "#a1a1aa"
                      : "#52525b"
                  }
                />
              </View>

              <View>
                <BodyText className="font-semibold mb-1">
                  Shuffle Questions
                </BodyText>

                <Caption className="text-neutral-900 dark:text-neutral-400">
                  Randomize the order of
                  questions. Answers and
                  explanations show
                  automatically.
                </Caption>
              </View>
            </View>

            <Switch
              value={
                shuffleQuestions
              }
              onValueChange={
                setShuffleQuestions
              }
              trackColor={{
                false: isDark
                  ? "#3f3f46"
                  : "#e4e4e7",
                true: "#4f46e5",
              }}
            />
          </View>
        </Card>
      </ScrollView>

      {/* ----------------------------------------------------------------- */}
      {/* Bottom Action */}
      {/* ----------------------------------------------------------------- */}

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-neutral-950/90 border-t border-neutral-200 dark:border-neutral-800">
        {isPreparing &&
          prepareStatus ? (
          <View className="flex-row items-center mb-3">
            <ActivityIndicator
              size="small"
              color="#4f46e5"
            />

            <Caption className="ml-2 text-neutral-700 dark:text-neutral-300">
              {prepareStatus}
            </Caption>
          </View>
        ) : null}

        <View className="flex-row gap-3">
          {matchingAttempt ? (
            <Button
              onPress={() =>
                resumeAttempt(
                  matchingAttempt.id,
                )
              }
              size="lg"
              loading={
                isPreparing
              }
              disabled={
                isPreparing
              }
              style={{
                flex: 1,
              }}
            >
              Resume
            </Button>
          ) : null}

          <Button
            onPress={
              startPracticeSession
            }
            size="lg"
            loading={isPreparing}
            disabled={
              !selectedSubject ||
              isPreparing ||
              Boolean(
                questionCountError,
              )
            }
            fullWidth={
              !matchingAttempt
            }
            style={
              matchingAttempt
                ? {
                  flex: 1,
                }
                : undefined
            }
          >
            Start Practice Session
          </Button>
        </View>
      </View>
    </View>
  );
}