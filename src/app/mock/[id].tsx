import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import { Heading, BodyText, Caption } from "@/components/Typography";
import { Button } from "@/components";
import { AutoHeightWebView } from "@/components/AutoHeightWebView";
import api from "@/lib/api";
import { storage } from "@/lib/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

type Question = {
  id: number;
  question_text: string;
  question_text_html: string;
  question_image: string | null;
  options: Array<{
    id: number;
    option_text: string;
    option_text_html: string;
    is_correct: boolean;
  }>;
  explanation: string | null;
  explanation_html: string | null;
};

type SubjectInfo = {
  id: number;
  name: string;
  code?: string;
  total_groups?: number;
  time_limit_minutes?: number;
  first_group?: {
    id: number;
    batch_number: number;
    total_questions: number;
  } | null;
};

type SessionData = {
  session_id?: string;
  mock_session_id?: string;
  exam_type?: { id: number; name: string; slug: string };
  subjects?: SubjectInfo[];
  duration_minutes?: number;
  total_questions?: number;
  time_limit_per_subject?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getShortSubjectName = (name?: string | null): string => {
  if (!name || typeof name !== "string") { return ""; }
  const lower = name.toLowerCase().trim();
  if (lower.includes("english")) { return "Eng"; }
  if (lower.includes("mathematics") || lower.includes("maths")) { return "Math"; }
  if (lower.includes("physics")) { return "Phys"; }
  if (lower.includes("chemistry")) { return "Chem"; }
  if (lower.includes("biology")) { return "Bio"; }
  if (lower.includes("government")) { return "Govt"; }
  if (lower.includes("economics")) { return "Econ"; }
  if (lower.includes("literature")) { return "Lit"; }
  if (lower.includes("christian") || lower.includes("crs")) { return "CRS"; }
  if (lower.includes("islamic") || lower.includes("irs")) { return "IRS"; }
  if (lower.includes("agricultural") || lower.includes("agric")) { return "Agric"; }
  if (lower.includes("geography")) { return "Geog"; }
  if (lower.includes("commerce")) { return "Comm"; }
  if (lower.includes("accounting") || lower.includes("account")) { return "Acc"; }
  if (lower.includes("history")) { return "Hist"; }
  if (lower.includes("yoruba")) { return "Yor"; }
  if (lower.includes("hausa")) { return "Hau"; }
  if (lower.includes("igbo")) { return "Igb"; }
  if (lower.includes("french")) { return "Fre"; }
  return name.length > 8 ? name.substring(0, 7) + "." : name;
};

const getOptionLabel = (index: number): string => String.fromCharCode(65 + index);

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonLoader = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { width } = useWindowDimensions();

  const SkeletonBar = ({ width: w, height: h, className = "" }: { width: number | string; height: number; className?: string }) => (
    <View
      className={`rounded-lg ${isDark ? "bg-neutral-800" : "bg-neutral-200"} ${className}`}
      style={{ width: w as number, height: h }}
    />
  );

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <View className="px-4 pt-12 pb-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <SkeletonBar width={width * 0.4} height={24} className="mb-2" />
            <SkeletonBar width={width * 0.3} height={16} />
          </View>
          <SkeletonBar width={80} height={36} className="rounded-full" />
        </View>
        <SkeletonBar width={width * 0.8} height={8} className="mt-3" />
      </View>

      <View className="px-3 py-2.5 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex-row gap-2">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBar key={i} height={40} width={0} className="flex-1 rounded-xl" />
        ))}
      </View>

      <View className="flex-1 px-4 pt-4">
        <View className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 mb-4">
          <SkeletonBar width={120} height={20} className="mb-3" />
          <SkeletonBar width={width * 0.9} height={16} className="mb-2" />
          <SkeletonBar width={width * 0.7} height={16} className="mb-2" />
          <SkeletonBar width={width * 0.5} height={16} />
        </View>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 mb-3">
            <View className="flex-row items-center gap-3">
              <SkeletonBar width={32} height={32} className="rounded-full" />
              <SkeletonBar width={width * 0.6} height={16} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MockQuizScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  // ── State ────────────────────────────────────────────────────────────────────

  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("Loading your mock exam...");
  const [error, setError] = useState<string | null>(null);

  const [session, setSession] = useState<SessionData | null>(null);
  const [subjectsData, setSubjectsData] = useState<SubjectInfo[]>([]);
  const [questionsBySubject, setQuestionsBySubject] = useState<Record<number, Question[]>>({});

  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, Record<number, number>>>({});

  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const [showResults, setShowResults] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [scores, setScores] = useState<Record<number, { score: number; total: number }>>({});

  const [showQuestionNavigator, setShowQuestionNavigator] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────────

  const scrollViewRef = useRef<ScrollView>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timerPulseAnim = useRef(new Animated.Value(1)).current;

  // ── Load session + questions ──────────────────────────────────────────────────

  useEffect(() => {
    const loadMockExam = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!id) {
          throw new Error("No mock session ID provided.");
        }

        // 1. Read session from AsyncStorage (stored by mock-setup)
        setLoadingStatus("Reading session data...");
        const raw = await storage.getItem(`mock_session_${id}`);
        if (!raw) {
          throw new Error("Session data not found. Please start a new mock exam.");
        }

        const sessionData: SessionData = JSON.parse(raw);
        setSession(sessionData);

        const subjects = sessionData.subjects ?? [];
        setSubjectsData(subjects);

        const durationMinutes = sessionData.duration_minutes ?? 120;
        setTimeRemaining(durationMinutes * 60);

        // 2. Fetch questions for each subject's first_group
        const examTypeId = sessionData.exam_type?.id;
        const fetchedQuestions: Record<number, Question[]> = {};

        for (let i = 0; i < subjects.length; i++) {
          const subject = subjects[i];
          setLoadingStatus(`Loading ${subject.name} questions... (${i + 1}/${subjects.length})`);

          const firstGroup = subject.first_group;
          if (!firstGroup) {
            fetchedQuestions[subject.id] = [];
            continue;
          }

          try {
            const res = await api.get(
              `/mock/groups/${firstGroup.batch_number}/download`,
              { params: { subject_id: subject.id, exam_type_id: examTypeId } },
            );

            const questionsRaw: Question[] =
              res.data?.data?.questions ?? res.data?.questions ?? [];

            fetchedQuestions[subject.id] = questionsRaw;
          } catch (fetchErr) {
            console.warn(`Failed to fetch questions for ${subject.name}:`, fetchErr);
            fetchedQuestions[subject.id] = [];
          }
        }

        setQuestionsBySubject(fetchedQuestions);
        setTimerActive(true);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load mock exam.");
      } finally {
        setIsLoading(false);
      }
    };

    loadMockExam();

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); }
    };
  }, [id]);

  // ── Timer ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!timerActive || showResults) { return; }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimerExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); }
    };
  }, [timerActive, showResults]);

  // ── Timer pulse when < 5 min ──────────────────────────────────────────────────

  useEffect(() => {
    if (timeRemaining > 0 && timeRemaining < 300) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(timerPulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
          Animated.timing(timerPulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      timerPulseAnim.setValue(1);
    }
  }, [timeRemaining < 300]);

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const getCurrentSubjectId = (): number => subjectsData[currentSubjectIndex]?.id ?? 0;

  const getCurrentQuestions = (): Question[] => {
    const subjectId = getCurrentSubjectId();
    return questionsBySubject[subjectId] ?? [];
  };

  const getCurrentQuestion = (): Question | null => {
    const questions = getCurrentQuestions();
    return questions[currentQuestionIndex] ?? null;
  };

  const getAnsweredCount = (subjectId: number): number =>
    Object.values(userAnswers[subjectId] ?? {}).filter((a) => a !== null && a !== undefined).length;

  const getTotalAnswered = (): number =>
    Object.values(userAnswers).reduce(
      (sum, answers) => sum + Object.values(answers).filter((a) => a !== null && a !== undefined).length,
      0,
    );

  const getTotalQuestions = (): number =>
    Object.values(questionsBySubject).reduce((sum, qs) => sum + qs.length, 0);

  // ── Actions ───────────────────────────────────────────────────────────────────

  const selectAnswer = (optionId: number) => {
    const subjectId = getCurrentSubjectId();
    setUserAnswers((prev) => ({
      ...prev,
      [subjectId]: { ...(prev[subjectId] ?? {}), [currentQuestionIndex]: optionId },
    }));

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.02, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const switchSubject = (index: number) => {
    setCurrentSubjectIndex(index);
    setCurrentQuestionIndex(0);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const nextQuestion = () => {
    const maxIndex = getCurrentQuestions().length - 1;
    if (currentQuestionIndex < maxIndex) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else if (currentSubjectIndex < subjectsData.length - 1) {
      setCurrentSubjectIndex((prev) => prev + 1);
      setCurrentQuestionIndex(0);
    }
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else if (currentSubjectIndex > 0) {
      setCurrentSubjectIndex((prev) => prev - 1);
      const prevSubjectId = subjectsData[currentSubjectIndex - 1]?.id;
      const prevQuestions = questionsBySubject[prevSubjectId] ?? [];
      setCurrentQuestionIndex(Math.max(prevQuestions.length - 1, 0));
    }
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const jumpToQuestion = (subjectIndex: number, questionIndex: number) => {
    setCurrentSubjectIndex(subjectIndex);
    setCurrentQuestionIndex(questionIndex);
    setShowQuestionNavigator(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleTimerExpired = () => {
    Alert.alert("Time Expired", "Your mock exam time has expired. Submitting now...", [
      { text: "OK", onPress: () => computeAndShowResults() },
    ]);
  };

  const computeAndShowResults = () => {
    if (timerRef.current) { clearInterval(timerRef.current); }

    const computed: Record<number, { score: number; total: number }> = {};
    for (const subject of subjectsData) {
      const questions = questionsBySubject[subject.id] ?? [];
      const answers = userAnswers[subject.id] ?? {};
      let score = 0;
      questions.forEach((q, idx) => {
        const selectedId = answers[idx];
        if (selectedId !== undefined && selectedId !== null) {
          const option = q.options.find((o) => o.id === selectedId);
          if (option?.is_correct) { score++; }
        }
      });
      computed[subject.id] = { score, total: questions.length };
    }

    setScores(computed);
    setShowResults(true);
    // Clean up storage
    storage.deleteItem(`mock_session_${id}`).catch(() => {});
  };

  const submitQuiz = () => {
    const answered = getTotalAnswered();
    const total = getTotalQuestions();

    Alert.alert(
      "Submit Mock Exam",
      `You have answered ${answered} out of ${total} questions. Once submitted, you cannot change your answers.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Submit", onPress: computeAndShowResults },
      ],
    );
  };

  const exitQuiz = () => {
    const answered = getTotalAnswered();
    const total = getTotalQuestions();

    Alert.alert(
      "Exit Mock Exam",
      `Are you sure you want to exit? Your progress (${answered}/${total} answered) will be lost.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Exit",
          style: "destructive",
          onPress: () => {
            if (timerRef.current) { clearInterval(timerRef.current); }
            storage.deleteItem(`mock_session_${id}`).catch(() => {});
            router.replace("/(tabs)/mock-setup");
          },
        },
      ],
    );
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <SkeletonLoader />
        <View className="absolute inset-0 items-center justify-center">
          <View className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 px-8 py-6 items-center mx-6">
            <View className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mb-4">
              <MaterialIcons name="timer" size={32} color="#7c3aed" />
            </View>
            <ActivityIndicator size="large" color="#7c3aed" />
            <BodyText className="mt-3 text-center text-neutral-600 dark:text-neutral-400">
              {loadingStatus}
            </BodyText>
          </View>
        </View>
      </View>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-8">
        <MaterialIcons name="error-outline" size={48} color="#ef4444" />
        <Heading size="md" className="mt-4 text-center text-red-500">{error}</Heading>
        <Button variant="outline" size="md" style={{ marginTop: 16 }} onPress={() => router.replace("/(tabs)/mock-setup")}>
          Back to Setup
        </Button>
      </View>
    );
  }

  // ─── Results Screen ───────────────────────────────────────────────────────────

  if (showResults) {
    const totalScore = Object.values(scores).reduce((sum, s) => sum + s.score, 0);
    const totalQuestionsCount = Object.values(scores).reduce((sum, s) => sum + s.total, 0);
    const overallPercentage = totalQuestionsCount > 0 ? Math.round((totalScore / totalQuestionsCount) * 100) : 0;

    const getScoreColor = (pct: number) => pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
    const getScoreEmoji = (pct: number) => pct >= 80 ? "🏆" : pct >= 60 ? "✅" : "⚠️";
    const getScoreMessage = (pct: number) => pct >= 70 ? "Excellent!" : pct >= 40 ? "Good effort!" : "Keep practicing!";

    return (
      <ScrollView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <View style={{ paddingTop: insets.top + 16 }} className="pb-8 px-6">
          <Heading size="xl" className="text-center mb-1">
            Mock Exam Completed! 🎉
          </Heading>
          <BodyText className="text-center text-neutral-500 dark:text-neutral-400">
            {session?.exam_type?.name ?? "Mock Exam"} · {subjectsData.length} subjects
          </BodyText>

          {/* Overall Score Ring */}
          <View className="items-center justify-center my-8">
            <View
              className="items-center justify-center rounded-full border-8"
              style={{
                width: 160,
                height: 160,
                borderColor: getScoreColor(overallPercentage),
              }}
            >
              <BodyText className="text-5xl font-bold text-center">
                {overallPercentage}%
              </BodyText>
              <Caption className="text-neutral-500 dark:text-neutral-400">
                {totalScore}/{totalQuestionsCount}
              </Caption>
            </View>
            <BodyText className="mt-4 font-semibold text-center" style={{ color: getScoreColor(overallPercentage) }}>
              {getScoreMessage(overallPercentage)}
            </BodyText>
          </View>

          {/* Per-Subject Breakdown */}
          {subjectsData.map((subject) => {
            const subjectScore = scores[subject.id];
            if (!subjectScore) { return null; }
            const pct = subjectScore.total > 0
              ? Math.round((subjectScore.score / subjectScore.total) * 100)
              : 0;

            return (
              <View
                key={subject.id}
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 mb-3"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <Heading size="md">
                    {getScoreEmoji(pct)} {subject.name}
                  </Heading>
                  <BodyText className="font-semibold">
                    {subjectScore.score}/{subjectScore.total}
                  </BodyText>
                </View>

                <View className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: getScoreColor(pct) }}
                  />
                </View>

                <View className="flex-row justify-between mt-2">
                  <Caption className="text-neutral-500 dark:text-neutral-400">
                    {pct}% correct
                  </Caption>
                  <Caption style={{ color: getScoreColor(pct) }}>
                    {getScoreMessage(pct)}
                  </Caption>
                </View>
              </View>
            );
          })}

          {/* Answer Review Toggle */}
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => setShowReview(!showReview)}
            className="mt-2 mb-3"
          >
            {showReview ? "Hide Answer Review" : "Review Answers"}
          </Button>

          {showReview && (
            <View className="mb-6">
              <Heading size="lg" className="mb-4">Answer Review</Heading>
              {subjectsData.map((subject) => {
                const questions = questionsBySubject[subject.id] ?? [];
                const subjectAnswers = userAnswers[subject.id] ?? {};

                return (
                  <View key={subject.id} className="mb-6">
                    <Heading size="md" className="mb-3 text-purple-700 dark:text-purple-300">
                      {subject.name}
                    </Heading>

                    {questions.map((q, idx) => {
                      const uAnswer = subjectAnswers[idx];
                      const isCorrectAns = q.options.find((o) => o.id === uAnswer)?.is_correct;
                      return (
                        <View key={q.id} className="bg-white dark:bg-neutral-900 rounded-xl p-4 mb-4 border border-neutral-200 dark:border-neutral-800">
                          <View className="flex-row justify-between items-center mb-2">
                            <BodyText className="font-bold text-neutral-900 dark:text-neutral-100">
                              Question {idx + 1}
                            </BodyText>
                            <View className={`px-2 py-1 rounded-full ${isCorrectAns ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                              <Caption className={isCorrectAns ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                                {isCorrectAns ? "✅ Correct" : "❌ Incorrect"}
                              </Caption>
                            </View>
                          </View>

                          <AutoHeightWebView html={q.question_text_html || q.question_text} scrollEnabled={false} />

                          <View className="mt-3">
                            {q.options.map((opt) => {
                              const isSelectedOpt = opt.id === uAnswer;
                              const isCorrectOpt = opt.is_correct;
                              let bgColor = "bg-transparent";
                              if (isSelectedOpt && isCorrectOpt) { bgColor = "bg-green-50 dark:bg-green-900/20"; }
                              else if (isSelectedOpt && !isCorrectOpt) { bgColor = "bg-red-50 dark:bg-red-900/20"; }
                              else if (isCorrectOpt) { bgColor = "bg-green-50/50 dark:bg-green-900/10"; }

                              return (
                                <View key={opt.id} className={`p-2 rounded-lg my-1 flex-row items-center ${bgColor}`}>
                                  <View className="flex-1">
                                    {(!opt.option_text_html || !opt.option_text_html.includes("<")) ? (
                                      <BodyText className="text-neutral-700 dark:text-neutral-300">{opt.option_text}</BodyText>
                                    ) : (
                                      <AutoHeightWebView html={opt.option_text_html || opt.option_text} scrollEnabled={false} />
                                    )}
                                  </View>
                                  {isSelectedOpt && isCorrectOpt && <MaterialIcons name="check-circle" size={16} color="#22c55e" />}
                                  {isSelectedOpt && !isCorrectOpt && <MaterialIcons name="cancel" size={16} color="#ef4444" />}
                                  {!isSelectedOpt && isCorrectOpt && <MaterialIcons name="check-circle" size={16} color="#4ade80" />}
                                </View>
                              );
                            })}
                          </View>

                          {q.explanation_html && (
                            <View className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                              <Caption className="font-bold text-blue-900 dark:text-blue-300 mb-1">💡 Explanation</Caption>
                              <AutoHeightWebView html={q.explanation_html} scrollEnabled={false} />
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          )}

          <Button size="lg" fullWidth onPress={() => router.replace("/(tabs)/mock-setup")}>
            Try Another Mock Exam
          </Button>
          <Button variant="outline" size="lg" fullWidth className="mt-3" onPress={() => router.replace("/(tabs)")}>
            Dashboard
          </Button>
        </View>
      </ScrollView>
    );
  }

  // ─── Quiz Screen ──────────────────────────────────────────────────────────────

  const currentQuestion = getCurrentQuestion();
  const currentSubject = subjectsData[currentSubjectIndex];
  const totalAnswered = getTotalAnswered();
  const totalQuestionsAll = getTotalQuestions();
  const progressPercentage = totalQuestionsAll > 0 ? (totalAnswered / totalQuestionsAll) * 100 : 0;
  const isAtStart = currentSubjectIndex === 0 && currentQuestionIndex === 0;
  const isAtEnd = currentSubjectIndex === subjectsData.length - 1 &&
    currentQuestionIndex >= getCurrentQuestions().length - 1;

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">

      {/* ── Header ── */}
      <View
        className={`border-b border-neutral-200 dark:border-neutral-800 ${isDark ? "bg-neutral-900" : "bg-white"}`}
        style={{ paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1 mr-2">
            <Heading size="lg" className="text-purple-700 dark:text-purple-300">
              ⏱ Mock Exam
            </Heading>
            <Caption className="text-neutral-500 dark:text-neutral-400">
              {session?.exam_type?.name ?? "Mock Exam"} · {currentSubject?.name ?? ""}
            </Caption>
          </View>

          {/* Timer */}
          <Animated.View
            className={`flex-row items-center px-3 py-1.5 rounded-full ${timeRemaining < 300
              ? "bg-red-50 dark:bg-red-900/20"
              : "bg-purple-50 dark:bg-purple-900/20"}`}
            style={{ transform: [{ scale: timerPulseAnim }] }}
          >
            <MaterialIcons
              name="alarm"
              size={18}
              color={timeRemaining < 300 ? "#ef4444" : "#7c3aed"}
              style={{ marginRight: 4 }}
            />
            <BodyText
              className={`font-mono text-base font-bold ${timeRemaining < 300
                ? "text-red-600 dark:text-red-400"
                : "text-purple-700 dark:text-purple-300"}`}
            >
              {formatTime(timeRemaining)}
            </BodyText>
          </Animated.View>
        </View>

        {/* Overall Progress Bar */}
        <View>
          <View className="flex-row justify-between mb-1">
            <Caption className="text-neutral-500 dark:text-neutral-400">Progress</Caption>
            <Caption className="text-neutral-500 dark:text-neutral-400">
              {totalAnswered}/{totalQuestionsAll}
            </Caption>
          </View>
          <View className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <View
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </View>
        </View>
      </View>

      {/* ── Subject Tabs ── */}
      <View className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 py-2.5 flex-row px-3 gap-2">
        {subjectsData.map((subject, index) => {
          const isActive = currentSubjectIndex === index;
          const answered = getAnsweredCount(subject.id);
          const total = questionsBySubject[subject.id]?.length ?? 0;
          const isComplete = total > 0 && answered === total;

          return (
            <TouchableOpacity
              key={subject.id}
              onPress={() => switchSubject(index)}
              className={`flex-1 py-1.5 rounded-xl items-center justify-center border relative ${isActive
                ? "bg-purple-600 border-purple-600 shadow-sm"
                : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"}`}
            >
              <BodyText
                className={`font-semibold text-xs text-center ${isActive ? "text-white" : "text-neutral-700 dark:text-neutral-300"}`}
              >
                {getShortSubjectName(subject.name)}
              </BodyText>

              <Caption
                className={`text-[10px] mt-0.5 text-center ${isActive ? "text-white/80 font-medium" : "text-neutral-500 dark:text-neutral-400"}`}
              >
                {answered}/{total}
              </Caption>

              {isComplete && (
                <View className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Main Scroll Body ── */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 180 }}
        showsVerticalScrollIndicator={false}
      >
        {currentQuestion ? (
          <>
            {/* Question Card */}
            <View className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full">
                    <Caption className="text-purple-700 dark:text-purple-300 font-semibold">
                      Q{currentQuestionIndex + 1}
                    </Caption>
                  </View>
                  <Caption className="text-neutral-500 dark:text-neutral-400">
                    of {getCurrentQuestions().length}
                  </Caption>
                </View>
                <View className="bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full">
                  <Caption className="text-neutral-600 dark:text-neutral-400">
                    {currentSubject?.name}
                  </Caption>
                </View>
              </View>

              <AutoHeightWebView
                html={currentQuestion.question_text_html || currentQuestion.question_text}
                scrollEnabled={false}
              />

              {currentQuestion.question_image && (
                <WebView
                  source={{ uri: currentQuestion.question_image }}
                  style={{ height: Math.min(200, height * 0.25), marginTop: 12, borderRadius: 8 }}
                />
              )}
            </View>

            {/* Options — no correctness feedback during exam, answers can be changed */}
            <View className="space-y-3 mb-4">
              {currentQuestion.options.map((option, optIndex) => {
                const subjectId = getCurrentSubjectId();
                const isSelected = userAnswers[subjectId]?.[currentQuestionIndex] === option.id;

                const borderColor = isSelected
                  ? "border-purple-500"
                  : "border-neutral-200 dark:border-neutral-800";
                const bgColor = isSelected
                  ? "bg-purple-50 dark:bg-purple-900/15"
                  : "bg-white dark:bg-neutral-900";

                return (
                  <Animated.View
                    key={option.id}
                    style={{ transform: [{ scale: isSelected ? scaleAnim : 1 }] }}
                  >
                    <TouchableOpacity
                      onPress={() => selectAnswer(option.id)}
                      className={`p-4 rounded-2xl border-2 ${borderColor} ${bgColor}`}
                      activeOpacity={0.7}
                    >
                      <View className="flex-row items-center gap-3">
                        {/* Option Letter Badge */}
                        <View
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "border-purple-600 bg-purple-600"
                              : "border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800"
                          }`}
                        >
                          <BodyText
                            className={`font-bold text-sm ${
                              isSelected
                                ? "text-white"
                                : "text-neutral-600 dark:text-neutral-400"
                            }`}
                          >
                            {getOptionLabel(optIndex)}
                          </BodyText>
                        </View>

                        <View className="flex-1">
                          {(!option.option_text_html || !option.option_text_html.includes("<")) ? (
                            <BodyText className={`${
                              isSelected
                                ? "text-purple-900 dark:text-purple-100"
                                : "text-neutral-900 dark:text-neutral-100"
                            }`}>
                              {option.option_text}
                            </BodyText>
                          ) : (
                            <AutoHeightWebView html={option.option_text_html || option.option_text} scrollEnabled={false} />
                          )}
                        </View>

                        {/* Only show selection check — no correct/wrong reveal */}
                        {isSelected && (
                          <MaterialIcons name="check-circle" size={22} color="#7c3aed" />
                        )}
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* No explanation shown during mock exam — revealed only in post-submit review */}
            {false && currentQuestion.explanation_html && (
                <View className="bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-5 mb-4">
                  <View className="flex-row gap-3">
                    <MaterialIcons name="info" size={20} color="#2563eb" />
                    <View className="flex-1">
                      <BodyText className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                        💡 Explanation
                      </BodyText>
                      <AutoHeightWebView html={currentQuestion.explanation_html} scrollEnabled={false} />
                    </View>
                  </View>
                </View>
              )}
          </>
        ) : (
          // No questions for this subject
          <View className="flex-1 items-center justify-center py-20">
            <MaterialIcons name="help-outline" size={48} color="#a1a1aa" />
            <BodyText className="mt-4 text-center text-neutral-500 dark:text-neutral-400">
              No questions available for {currentSubject?.name ?? "this subject"}.
            </BodyText>
          </View>
        )}
      </ScrollView>

      {/* ── Fixed Bottom Bar ── */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800"
        style={{ paddingBottom: insets.bottom + 12, paddingHorizontal: 16, paddingTop: 12 }}
      >
        {/* Navigation Row */}
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity
            onPress={previousQuestion}
            disabled={isAtStart}
            className="w-12 h-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
            style={{ opacity: isAtStart ? 0.4 : 1 }}
          >
            <MaterialIcons name="chevron-left" size={28} color={isDark ? "#fafafa" : "#171717"} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowQuestionNavigator(true)}
            className="flex-row items-center px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-full"
          >
            <BodyText className="text-purple-700 dark:text-purple-300 font-semibold">
              {currentQuestionIndex + 1}/{getCurrentQuestions().length}
            </BodyText>
            <MaterialIcons name="expand-more" size={20} color={isDark ? "#a78bfa" : "#7c3aed"} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={nextQuestion}
            className="w-12 h-12 items-center justify-center rounded-full bg-purple-600"
          >
            <MaterialIcons name="chevron-right" size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={exitQuiz}
            className="flex-1 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 items-center"
          >
            <BodyText className="text-neutral-600 dark:text-neutral-400">Exit</BodyText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={submitQuiz}
            className="flex-1 py-3 rounded-xl bg-purple-600 items-center"
          >
            <BodyText className="text-white font-semibold">Submit Exam</BodyText>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Question Navigator Modal ── */}
      <Modal
        visible={showQuestionNavigator}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQuestionNavigator(false)}
      >
        <View className="flex-1 bg-white dark:bg-neutral-900">
          <View
            className="border-b border-neutral-200 dark:border-neutral-800"
            style={{ paddingTop: insets.top + 16, paddingBottom: 16, paddingHorizontal: 16 }}
          >
            <View className="flex-row items-center justify-between">
              <Heading size="lg">📋 Questions</Heading>
              <TouchableOpacity
                onPress={() => setShowQuestionNavigator(false)}
                style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" }}
              >
                <MaterialIcons name="close" size={24} color={isDark ? "#fafafa" : "#171717"} />
              </TouchableOpacity>
            </View>

            {/* Legend */}
            <View className="flex-row items-center gap-4 mt-3">
              <View className="flex-row items-center gap-1.5">
                <View className="w-3 h-3 bg-green-500 rounded-full" />
                <Caption className="text-neutral-600 dark:text-neutral-400">Answered</Caption>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View className="w-3 h-3 bg-purple-600 rounded-full" />
                <Caption className="text-neutral-600 dark:text-neutral-400">Current</Caption>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View className="w-3 h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
                <Caption className="text-neutral-600 dark:text-neutral-400">Unanswered</Caption>
              </View>
            </View>

            <Caption className="mt-2 text-neutral-500 dark:text-neutral-400">
              Total Progress: {getTotalAnswered()}/{getTotalQuestions()} answered
            </Caption>
          </View>

          <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
            {subjectsData.map((subject, subjectIndex) => {
              const questions = questionsBySubject[subject.id] ?? [];
              const subjectAnswers = userAnswers[subject.id] ?? {};
              const answeredCount = getAnsweredCount(subject.id);

              return (
                <View key={subject.id} className="mb-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <Heading size="md">{subject.name}</Heading>
                    <Caption className="text-neutral-500 dark:text-neutral-400">
                      {answeredCount}/{questions.length} answered
                    </Caption>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {questions.map((_, questionIndex) => {
                      const isAnswered = subjectAnswers[questionIndex] !== undefined &&
                        subjectAnswers[questionIndex] !== null;
                      const isCurrent =
                        currentSubjectIndex === subjectIndex &&
                        currentQuestionIndex === questionIndex;

                      return (
                        <TouchableOpacity
                          key={questionIndex}
                          onPress={() => jumpToQuestion(subjectIndex, questionIndex)}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isCurrent
                            ? "bg-purple-600"
                            : isAnswered
                              ? "bg-green-500"
                              : "bg-neutral-100 dark:bg-neutral-800"}`}
                          style={{
                            shadowColor: isCurrent ? "#7c3aed" : isAnswered ? "#22c55e" : "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 2,
                          }}
                        >
                          <BodyText
                            className={`font-semibold ${isCurrent || isAnswered ? "text-white" : "text-neutral-600 dark:text-neutral-400"}`}
                          >
                            {questionIndex + 1}
                          </BodyText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View
            className="border-t border-neutral-200 dark:border-neutral-800"
            style={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 16, paddingTop: 16 }}
          >
            <Button variant="outline" size="lg" fullWidth onPress={submitQuiz} style={{ minHeight: 44 }}>
              Submit Mock Exam
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}
