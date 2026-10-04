import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  View,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";

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

type ExamType = {
  id: number;
  name: string;
  exam_format?: string;
};

type Subject = {
  id: number;
  name: string;
  question_count?: number;
  time_limit_minutes?: number | null;
  available_mock_questions?: number;
};

type MockGroup = {
  id: number;
  batch_number: number;
  total_questions: number;
  is_completed: boolean;
  best_score: number | null;
};

type MockFormatSpec = {
  overall?: {
    time_limit?: number;
    sum_subject_time?: boolean;
  };

  per_subject?: Array<{
    match: string[];
    questions: number;
    time?: number;
  }>;

  default?: {
    questions: number;
    time?: number;
  };
};

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const JAMB_MAX_SUBJECTS = 4;
const CONFIG_TIMEOUT = 15000;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function createTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
  // AbortSignal.timeout is available on modern runtimes.
  // Keep this defensive for environments where it isn't available.
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(timeoutMs);
  }

  return undefined;
}

// -----------------------------------------------------------------------------
// Screen
// -----------------------------------------------------------------------------

export default function MockSetupScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const router = useRouter();
  const netInfo = useNetInfo();

  // ---------------------------------------------------------------------------
  // Subscription
  // ---------------------------------------------------------------------------

  const { isAllowed, isChecking } = useSubscriptionGuard({
    requirePaidOnly: true,
  });

  // ---------------------------------------------------------------------------
  // Screen state
  // ---------------------------------------------------------------------------

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // API data
  // ---------------------------------------------------------------------------

  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mockFormats, setMockFormats] = useState<
    Record<string, MockFormatSpec>
  >({});

  // ---------------------------------------------------------------------------
  // User selections
  // ---------------------------------------------------------------------------

  const [selectedExamType, setSelectedExamType] = useState<ExamType | null>(
    null,
  );

  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);

  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [mockGroups, setMockGroups] = useState<MockGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  const subjectLimit =
    selectedExamType?.exam_format?.toLowerCase() === "jamb"
      ? JAMB_MAX_SUBJECTS
      : null;

  const getSubjectSpec = useCallback(
    (subject: Subject) => {
      const examFormat =
        selectedExamType?.exam_format?.toLowerCase() ?? "default";
      const format = mockFormats[examFormat] ?? mockFormats.default;
      const subjectName = subject.name.toLowerCase();
      const matchingRule = format?.per_subject?.find((rule) =>
        rule.match.some(
          (pattern) => pattern && subjectName.includes(pattern.toLowerCase()),
        ),
      );

      return {
        questions: matchingRule?.questions ?? format?.default?.questions ?? 50,
        time: matchingRule?.time ?? format?.default?.time ?? null,
      };
    },
    [mockFormats, selectedExamType],
  );

  const totalQuestions = selectedSubjects.reduce(
    (total, subject) => total + getSubjectSpec(subject).questions,
    0,
  );

  const totalTime = (() => {
    const examFormat =
      selectedExamType?.exam_format?.toLowerCase() ?? "default";
    const overall = mockFormats[examFormat]?.overall;

    if (overall?.time_limit) {
      return overall.time_limit;
    }

    if (overall?.sum_subject_time) {
      return (
        selectedSubjects.reduce(
          (total, subject) => total + (getSubjectSpec(subject).time ?? 0),
          0,
        ) || 100
      );
    }

    return 100;
  })();

  // ---------------------------------------------------------------------------
  // Mock preparation
  // ---------------------------------------------------------------------------

  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareStatus, setPrepareStatus] = useState<string | null>(null);

  const [isUpdatingSelection, setIsUpdatingSelection] = useState(false);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------

  const mountedRef = useRef(true);

  const subjectsRequestIdRef = useRef(0);

  const initialConfigLoadedRef = useRef(false);

  const previousConnectionRef = useRef<boolean | null>(null);

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Keep selected subjects valid
  // ---------------------------------------------------------------------------

  const preserveValidSelectedSubjects = useCallback(
    (fetchedSubjects: Subject[]) => {
      if (!mountedRef.current) {
        return;
      }

      const allowedSubjectIds = new Set(
        fetchedSubjects.map((subject) => subject.id),
      );

      setSelectedSubjects((previous) =>
        previous.filter((subject) => allowedSubjectIds.has(subject.id)),
      );
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Fetch subjects for an exam type
  // ---------------------------------------------------------------------------

  const fetchSubjectsForExamType = useCallback(
    async (examTypeId?: number) => {
      const requestId = ++subjectsRequestIdRef.current;

      if (!examTypeId) {
        if (!mountedRef.current) {
          return;
        }

        setSubjects([]);
        setSelectedSubjects([]);

        return;
      }

      try {
        const signal = createTimeoutSignal(CONFIG_TIMEOUT);

        const response = await api.get("/mock/subjects", {
          params: {
            exam_type_id: examTypeId,
          },
          ...(signal ? { signal } : {}),
        });

        // Ignore stale requests.
        if (!mountedRef.current || requestId !== subjectsRequestIdRef.current) {
          return;
        }

        const fetchedSubjects: Subject[] =
          response.data?.data ?? response.data ?? [];

        setSubjects(fetchedSubjects);

        preserveValidSelectedSubjects(fetchedSubjects);
      } catch (e: any) {
        if (!mountedRef.current) {
          return;
        }

        if (e?.code === "ERR_CANCELED") {
          console.log("Subject request cancelled/timed out.");
          return;
        }

        console.warn("Failed to load subjects:", e?.response?.data ?? e);

        setError(
          "Failed to load subjects. Please check your connection and try again.",
        );
      }
    },
    [preserveValidSelectedSubjects],
  );

  const browseMockGroups = useCallback(async () => {
    if (!selectedExamType || selectedSubjects.length !== 1) {
      return;
    }

    setIsLoadingGroups(true);
    setShowBatchPicker(true);

    try {
      const response = await api.get("/mock/groups", {
        params: {
          subject_id: selectedSubjects[0].id,
          exam_type_id: selectedExamType.id,
        },
      });

      setMockGroups(response.data?.data ?? []);
    } catch (fetchError: any) {
      setShowBatchPicker(false);
      Alert.alert(
        "Unable to Load Mock Batches",
        fetchError?.response?.data?.message ?? "Please try again.",
      );
    } finally {
      setIsLoadingGroups(false);
    }
  }, [selectedExamType, selectedSubjects]);

  // ---------------------------------------------------------------------------
  // Fetch complete mock configuration
  // ---------------------------------------------------------------------------

  const fetchConfig = useCallback(
    async (options?: { showLoader?: boolean; preserveSelection?: boolean }) => {
      if (!isAllowed || isChecking) {
        return;
      }

      const showLoader = options?.showLoader ?? true;
      const preserveSelection = options?.preserveSelection ?? false;

      try {
        if (mountedRef.current && showLoader) {
          setIsLoading(true);
        }

        if (mountedRef.current) {
          setError(null);
        }

        console.log("MOCK: Loading configuration...");

        const signal = createTimeoutSignal(CONFIG_TIMEOUT);

        const [examRes, formatsRes] = await Promise.all([
          api.get("/config/exam-types", {
            ...(signal ? { signal } : {}),
          }),

          api.get("/config/mock-formats", {
            ...(signal ? { signal } : {}),
          }),
        ]);

        if (!mountedRef.current) {
          return;
        }

        const fetchedExamTypes: ExamType[] =
          examRes.data?.data ?? examRes.data ?? [];

        const fetchedFormats: Record<string, MockFormatSpec> =
          formatsRes.data?.data ?? {};

        setExamTypes(fetchedExamTypes);
        setMockFormats(fetchedFormats);

        console.log("MOCK: Configuration loaded successfully.");

        // ---------------------------------------------------------------------
        // Initial subject loading
        //
        // We intentionally do NOT load all subjects here.
        // Subjects depend on the selected exam type.
        // ---------------------------------------------------------------------

        if (!preserveSelection) {
          setSelectedExamType(null);
          setSelectedSubjects([]);
          setSubjects([]);
        }

        initialConfigLoadedRef.current = true;
      } catch (e: any) {
        if (!mountedRef.current) {
          return;
        }

        console.warn("MOCK CONFIG ERROR:", e?.response?.data ?? e);

        let message =
          "Failed to load configuration. Please check your network connection.";

        if (e?.code === "ERR_CANCELED") {
          message =
            "The request took too long. Please check your connection and try again.";
        }

        setError(message);
      } finally {
        if (mountedRef.current && showLoader) {
          setIsLoading(false);
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
      setIsLoading(false);
      return;
    }

    fetchConfig({
      showLoader: true,
      preserveSelection: false,
    });
  }, [isAllowed, isChecking, fetchConfig]);

  // ---------------------------------------------------------------------------
  // Network restoration
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const isConnected = netInfo.isConnected === true;

    const wasDisconnected = previousConnectionRef.current === false;

    previousConnectionRef.current = netInfo.isConnected;

    if (!isConnected) {
      return;
    }

    if (isChecking || !isAllowed) {
      return;
    }

    // Don't refetch immediately on first render.
    if (previousConnectionRef.current === null) {
      return;
    }

    // Only refresh when connection actually comes back.
    if (!wasDisconnected) {
      return;
    }

    console.log("MOCK: Network restored. Refreshing configuration...");

    fetchConfig({
      showLoader: false,
      preserveSelection: true,
    });
  }, [netInfo.isConnected, isAllowed, isChecking, fetchConfig]);

  // ---------------------------------------------------------------------------
  // Load subjects whenever exam type changes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!initialConfigLoadedRef.current) {
      return;
    }

    if (!selectedExamType) {
      setSubjects([]);
      setSelectedSubjects([]);
      return;
    }

    let cancelled = false;

    const syncSubjects = async () => {
      try {
        setIsUpdatingSelection(true);

        await fetchSubjectsForExamType(selectedExamType.id);
      } catch (e) {
        if (!cancelled) {
          console.warn("Failed to sync subjects:", e);
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setIsUpdatingSelection(false);
        }
      }
    };

    syncSubjects();

    return () => {
      cancelled = true;
    };
  }, [selectedExamType, fetchSubjectsForExamType]);

  // ---------------------------------------------------------------------------
  // Subject selection
  // ---------------------------------------------------------------------------

  const toggleSubject = useCallback(
    (subject: Subject) => {
      setSelectedSubjects((previous) => {
        const alreadySelected = previous.some((item) => item.id === subject.id);

        if (alreadySelected) {
          return previous.filter((item) => item.id !== subject.id);
        }

        if (subjectLimit !== null && previous.length >= subjectLimit) {
          return previous;
        }

        return [...previous, subject];
      });
    },
    [subjectLimit],
  );

  const selectExamType = (examType: ExamType) => {
    if (selectedExamType?.id === examType.id) {
      return;
    }

    setSelectedExamType(examType);
    setSelectedSubjects([]);
  };

  // ---------------------------------------------------------------------------
  // Start mock exam
  // ---------------------------------------------------------------------------

  const startMock = useCallback(
    async (mockGroupId?: number) => {
      if (!selectedExamType) {
        return;
      }

      if (selectedSubjects.length === 0) {
        return;
      }

      try {
        setIsPreparing(true);
        setPrepareStatus("Creating mock session...");
        setError(null);

        const payload = {
          exam_type_id: selectedExamType.id,
          subject_ids: selectedSubjects.map((subject) => subject.id),
          year: null,
          shuffle: true,
          ...(mockGroupId ? { mock_group_id: mockGroupId } : {}),
        };

        console.log("MOCK: Creating session...", payload);

        const response = await api.post("/mock/sessions", payload);

        const sessionData = response.data?.data;

        const sessionId =
          sessionData?.mock_session_id ?? sessionData?.session_id;

        if (!sessionId) {
          throw new Error("Failed to create a mock session ID.");
        }

        console.log("MOCK: Session created:", sessionId);

        router.push(`/mock/${sessionId}`);
      } catch (e: any) {
        console.warn("MOCK: Failed to start:", e?.response?.data ?? e);

        const message =
          e?.response?.data?.message ??
          e?.message ??
          "An unknown error occurred.";

        Alert.alert("Failed to Start Mock Exam", message);

        setError(message);
      } finally {
        if (mountedRef.current) {
          setIsPreparing(false);
          setPrepareStatus(null);
        }
      }
    },
    [selectedExamType, selectedSubjects, router],
  );

  // ---------------------------------------------------------------------------
  // Rendering: authentication/subscription check
  // ---------------------------------------------------------------------------

  if (isChecking) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-8">
        <ActivityIndicator size="large" color="#4f46e5" />

        <BodyText className="mt-4 text-center text-neutral-900 dark:text-neutral-400">
          Checking your subscription...
        </BodyText>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Rendering: subscription required
  // ---------------------------------------------------------------------------

  if (!isAllowed) {
    return <SubscriptionGuardView featureName="Mock Exams" />;
  }

  // ---------------------------------------------------------------------------
  // Rendering: configuration loading
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Rendering: configuration error
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-8">
        <MaterialIcons name="cloud-off" size={48} color="#a1a1aa" />

        <BodyText className="mt-4 text-center text-neutral-900 dark:text-neutral-400">
          {error}
        </BodyText>

        <Button
          className="mt-6"
          variant="primary"
          onPress={() => {
            fetchConfig({
              showLoader: true,
              preserveSelection: true,
            });
          }}
        >
          Try Again
        </Button>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Main UI
  // ---------------------------------------------------------------------------

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View className="pt-16 pb-6 px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <Heading size="xl" className="mb-2">
          Mock Exam Setup
        </Heading>

        <BodyText className="text-neutral-900 dark:text-neutral-400">
          {subjectLimit
            ? `Choose an exam type and up to ${subjectLimit} subjects for a full mock.`
            : "Choose an exam type and subjects for a full mock."}
        </BodyText>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 120,
        }}
      >
        {/* Exam Type */}
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
          {examTypes.map((examType) => (
            <Button
              key={examType.id}
              variant={
                selectedExamType?.id === examType.id ? "primary" : "outline"
              }
              onPress={() => selectExamType(examType)}
              disabled={isUpdatingSelection}
              size="sm"
              style={{
                marginRight: 12,
                marginBottom: 12,
              }}
            >
              {examType.name}
            </Button>
          ))}
        </View>

        {/* Subjects */}
        <Subheading size="md" className="mb-3 px-2">
          {subjectLimit
            ? `Select Subjects (up to ${subjectLimit})`
            : "Select Subjects"}
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
          {subjects.map((subject) => {
            const selected = selectedSubjects.some(
              (item) => item.id === subject.id,
            );

            const canSelect =
              subjectLimit === null ||
              selectedSubjects.length < subjectLimit ||
              selected;

            return (
              <View key={subject.id} className="mr-3 mb-3 items-start">
                <Button
                  variant={selected ? "primary" : "outline"}
                  onPress={() => toggleSubject(subject)}
                  disabled={!canSelect || isUpdatingSelection}
                  size="sm"
                >
                  {subject.name}
                </Button>
                <Caption className="mt-1 px-1 text-neutral-500 dark:text-neutral-400">
                  {getSubjectSpec(subject).questions} questions
                  {getSubjectSpec(subject).time
                    ? ` · ${getSubjectSpec(subject).time} min`
                    : ""}
                </Caption>
              </View>
            );
          })}
        </View>

        {selectedSubjects.length > 0 ? (
          <Card
            variant="bordered"
            padding="md"
            className="mx-2 mb-6 bg-white dark:bg-neutral-900"
          >
            <Subheading size="sm" className="mb-3">
              Mock Summary
            </Subheading>
            {selectedSubjects.map((subject) => {
              const specification = getSubjectSpec(subject);

              return (
                <View
                  key={subject.id}
                  className="flex-row items-center justify-between py-1"
                >
                  <Caption className="flex-1 text-neutral-700 dark:text-neutral-300">
                    {subject.name}
                  </Caption>
                  <Caption className="text-neutral-600 dark:text-neutral-400">
                    {specification.questions} questions
                    {specification.time ? ` · ${specification.time} min` : ""}
                  </Caption>
                </View>
              );
            })}
            <View className="mt-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
              <View className="flex-row justify-between">
                <Caption className="text-neutral-600 dark:text-neutral-400">
                  Total questions
                </Caption>
                <Caption className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {totalQuestions}
                </Caption>
              </View>
              <View className="mt-1 flex-row justify-between">
                <Caption className="text-neutral-600 dark:text-neutral-400">
                  Time allowed
                </Caption>
                <Caption className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {totalTime} min
                </Caption>
              </View>
            </View>
          </Card>
        ) : null}

        {selectedExamType && !isUpdatingSelection && subjects.length === 0 ? (
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

        <View className="gap-2">
          {selectedSubjects.length === 1 ? (
            <Button
              onPress={browseMockGroups}
              disabled={!selectedExamType || isPreparing || isLoadingGroups}
              loading={isLoadingGroups}
              size="md"
              variant="outline"
              fullWidth
            >
              Browse Mock Batches
            </Button>
          ) : null}

          <Button
            onPress={() => startMock()}
            disabled={
              !selectedExamType || selectedSubjects.length === 0 || isPreparing
            }
            loading={isPreparing}
            size="lg"
            variant="primary"
            fullWidth
          >
            {selectedSubjects.length === 1
              ? "Start Full Mock"
              : "Start Mock Exam"}
          </Button>
        </View>
      </View>

      <Modal
        visible={showBatchPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBatchPicker(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[82%] rounded-t-3xl bg-white px-5 pb-8 pt-5 dark:bg-neutral-900">
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Heading size="lg">Mock Batches</Heading>
                <Caption className="text-neutral-500 dark:text-neutral-400">
                  {selectedSubjects[0]?.name}
                </Caption>
              </View>
              <Button
                size="sm"
                variant="outline"
                onPress={() => setShowBatchPicker(false)}
              >
                Close
              </Button>
            </View>

            {isLoadingGroups ? (
              <View className="items-center py-10">
                <ActivityIndicator size="large" color="#4f46e5" />
              </View>
            ) : mockGroups.length === 0 ? (
              <Caption className="py-10 text-center text-neutral-500 dark:text-neutral-400">
                No mock batches are available for this subject yet.
              </Caption>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-3">
                  {mockGroups.map((group) => (
                    <Card
                      key={group.id}
                      variant="bordered"
                      padding="md"
                      className="bg-white dark:bg-neutral-950"
                    >
                      <View className="mb-3 flex-row items-start justify-between gap-3">
                        <View>
                          <Subheading size="md">
                            Mock {group.batch_number}
                          </Subheading>
                          <Caption className="mt-1 text-neutral-500 dark:text-neutral-400">
                            {group.total_questions} questions · Approx. 60 min
                          </Caption>
                        </View>
                        {group.is_completed ? (
                          <Caption className="text-green-700 dark:text-green-400">
                            {group.best_score !== null
                              ? `Best ${Number(group.best_score).toFixed(1)}%`
                              : "Completed"}
                          </Caption>
                        ) : null}
                      </View>
                      <Button
                        onPress={() => {
                          setShowBatchPicker(false);
                          startMock(group.id);
                        }}
                        disabled={isPreparing}
                        loading={isPreparing}
                        size="md"
                        variant="primary"
                        fullWidth
                      >
                        {group.is_completed
                          ? `Retake Mock ${group.batch_number}`
                          : `Start Mock ${group.batch_number}`}
                      </Button>
                    </Card>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
