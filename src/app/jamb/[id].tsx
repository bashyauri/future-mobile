import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  Animated,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import { Heading, BodyText, Caption } from "@/components/Typography";
import { Button } from "@/components";
import { AutoHeightWebView } from "@/components/AutoHeightWebView";
import api from "@/lib/api";
import { storage } from "@/lib/storage";

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

type SubjectData = {
  id: number;
  name: string;
};

const getShortSubjectName = (name?: string | null): string => {
  if (!name || typeof name !== "string") {
    return "";
  }
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

// Skeleton Loader Component
const SkeletonLoader = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { width } = useWindowDimensions();

  const SkeletonBar = ({ width: w, height: h, className = "" }: any) => (
    <View
      className={`rounded-lg ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'} ${className}`}
      style={{ width: w, height: h }}
    />
  );

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header Skeleton */}
      <View className="px-4 pt-12 pb-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <SkeletonBar width={width * 0.4} height={24} className="mb-2" />
            <SkeletonBar width={width * 0.3} height={16} />
          </View>
          <SkeletonBar width={60} height={36} className="rounded-full" />
        </View>
        <SkeletonBar width={width * 0.8} height={8} className="mt-3" />
      </View>

      {/* Subject Tabs Skeleton */}
      <View className="px-3 py-2.5 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex-row gap-2">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBar key={i} height={40} className="flex-1 rounded-xl" />
        ))}
      </View>

      {/* Question Card Skeleton */}
      <View className="flex-1 px-4 pt-4">
        <View className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 mb-4">
          <SkeletonBar width={120} height={20} className="mb-3" />
          <SkeletonBar width={width * 0.9} height={16} className="mb-2" />
          <SkeletonBar width={width * 0.7} height={16} className="mb-2" />
          <SkeletonBar width={width * 0.5} height={16} />
        </View>

        {/* Options Skeleton */}
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

export default function JambQuizScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const { id } = useLocalSearchParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [questionsBySubject, setQuestionsBySubject] = useState<Record<number, Question[]>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, Record<number, number>>>({});
  const [subjectsData, setSubjectsData] = useState<SubjectData[]>([]);

  const [showResults, setShowResults] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [scores, setScores] = useState<Record<number, { score: number; total: number }>>({});

  const [showQuestionNavigator, setShowQuestionNavigator] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timerPulseAnim = useRef(new Animated.Value(1)).current;

  // Responsive heights based on screen size
  const webViewHeight = Math.max(120, Math.min(height * 0.15, 200));
  const explanationHeight = Math.max(80, Math.min(height * 0.1, 150));

  useEffect(() => {
    const loadAttempt = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await api.get(`/jamb/load/${id}`);
        const data = response.data?.data ?? response.data;

        if (!data?.attempt_id) {
          throw new Error("JAMB attempt could not be loaded.");
        }

        setAttemptId(data.attempt_id);
        setTimeLimit(data.time_limit ?? null);
        setCurrentSubjectIndex(data.current_subject_index ?? 0);
        setCurrentQuestionIndex(data.current_question_index ?? 0);
        setQuestionsBySubject(data.questions_by_subject ?? {});
        // Ensure user_answers is properly structured - only include non-null answers
        const answers = data.user_answers ?? {};
        const cleanedAnswers: Record<number, Record<number, number>> = {};
        Object.keys(answers).forEach(subjectId => {
          const subjectAnswers = answers[subjectId];
          if (subjectAnswers && typeof subjectAnswers === 'object') {
            const cleanedSubjectAnswers: Record<number, number> = {};
            Object.keys(subjectAnswers).forEach(questionIdx => {
              const val = subjectAnswers[questionIdx];
              if (val !== null && val !== undefined) {
                cleanedSubjectAnswers[parseInt(questionIdx)] = val;
              }
            });
            if (Object.keys(cleanedSubjectAnswers).length > 0) {
              cleanedAnswers[parseInt(subjectId)] = cleanedSubjectAnswers;
            }
          }
        });
        setUserAnswers(cleanedAnswers);
        setSubjectsData(data.subjects_data ?? []);

        if (data.time_limit && data.time_limit > 0) {
          const elapsed = data.elapsed_seconds ?? 0;
          setTimeRemaining(data.time_limit * 60 - elapsed);
        }

        await storage.setItem(
          `jamb_attempt_${id}`,
          JSON.stringify(data),
        );
      } catch (e: any) {
        setError(
          e?.response?.data?.message ?? e?.message ?? "Failed to load JAMB attempt.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadAttempt();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (timeLimit && timeLimit > 0 && timeRemaining > 0 && !showResults) {
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
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLimit, timeRemaining, showResults]);

  useEffect(() => {
    if (!showResults && attemptId) {
      autosaveTimerRef.current = setInterval(() => {
        autosave();
      }, 10000);
    }

    return () => {
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    };
  }, [showResults, attemptId, userAnswers, currentSubjectIndex, currentQuestionIndex]);

  // Timer pulse animation when less than 5 minutes
  useEffect(() => {
    if (timeRemaining > 0 && timeRemaining < 300) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(timerPulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(timerPulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      timerPulseAnim.setValue(1);
    }
  }, [timeRemaining]);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getCurrentSubjectId = (): number => {
    return subjectsData[currentSubjectIndex]?.id ?? 0;
  };

  const getCurrentQuestions = (): Question[] => {
    const subjectId = getCurrentSubjectId();
    return questionsBySubject[subjectId] ?? [];
  };

  const getCurrentQuestion = (): Question | null => {
    const questions = getCurrentQuestions();
    return questions[currentQuestionIndex] ?? null;
  };

  const selectAnswer = (optionId: number) => {
    const subjectId = getCurrentSubjectId();
    setUserAnswers((prev) => ({
      ...prev,
      [subjectId]: {
        ...(prev[subjectId] ?? {}),
        [currentQuestionIndex]: optionId,
      },
    }));

    // Animate selection
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.02,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const autosave = async () => {
    if (!attemptId) return;

    try {
      await api.post("/jamb/exit", {
        attempt_id: attemptId,
        user_answers: userAnswers,
        current_subject_index: currentSubjectIndex,
        current_question_index: currentQuestionIndex,
      });
    } catch (error) {
      console.error("Autosave failed:", error);
    }
  };

  const handleTimerExpired = () => {
    Alert.alert("Time Expired", "Your time has expired. Submitting your test...", [
      {
        text: "OK",
        onPress: () => submitQuiz(),
      },
    ]);
  };

  const submitQuiz = async () => {
    const answered = Object.values(userAnswers).reduce(
      (sum, answers) => sum + Object.values(answers).filter((a) => a !== null).length,
      0,
    );
    const total = Object.values(questionsBySubject).reduce(
      (sum, questions) => sum + questions.length,
      0,
    );

    Alert.alert(
      "Submit Test",
      `You have answered ${answered} out of ${total} questions. Once submitted, you won't be able to change your answers.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Submit",
          onPress: async () => {
            try {
              setIsLoading(true);
              const response = await api.post("/jamb/submit", {
                attempt_id: attemptId,
                user_answers: userAnswers,
              });

              setScores(response.data?.data?.scores_by_subject ?? response.data?.scores ?? {});
              setShowResults(true);

              if (timerRef.current) clearInterval(timerRef.current);
              if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);

              await storage.deleteItem(`jamb_attempt_${id}`);
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.response?.data?.message ?? "Failed to submit test",
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const exitQuiz = async () => {
    const answered = Object.values(userAnswers).reduce(
      (sum, answers) => sum + Object.values(answers).filter((a) => a !== null).length,
      0,
    );
    const total = Object.values(questionsBySubject).reduce(
      (sum, questions) => sum + questions.length,
      0,
    );

    Alert.alert(
      "Exit & Save Progress",
      `Your progress will be saved and you can continue this practice test later.\n\nCurrent progress: ${answered} of ${total} questions answered.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Exit",
          onPress: async () => {
            try {
              await api.post("/jamb/exit", {
                attempt_id: attemptId,
                user_answers: userAnswers,
                current_subject_index: currentSubjectIndex,
                current_question_index: currentQuestionIndex,
              });
              router.back();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.response?.data?.message ?? "Failed to exit test",
              );
            }
          },
        },
      ],
    );
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

  const getAnsweredCount = (subjectId: number): number => {
    return Object.values(userAnswers[subjectId] ?? {}).filter((a) => a !== null && a !== undefined).length;
  };

  const getTotalAnswered = (): number => {
    return Object.values(userAnswers).reduce(
      (sum, answers) => sum + Object.values(answers).filter((a) => a !== null && a !== undefined).length,
      0,
    );
  };

  const getTotalQuestions = (): number => {
    return Object.values(questionsBySubject).reduce(
      (sum, questions) => sum + questions.length,
      0,
    );
  };

  const getOptionLabel = (index: number): string => {
    return String.fromCharCode(65 + index); // A, B, C, D, ...
  };

  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-8">
        <MaterialIcons name="error-outline" size={48} color="#ef4444" />
        <BodyText className="mt-4 text-center text-red-500">{error}</BodyText>
        <Button variant="outline" size="md" style={{ marginTop: 16 }} onPress={() => router.back()}>
          Go Back
        </Button>
      </View>
    );
  }

  if (showResults) {
    const totalScore = Object.values(scores).reduce((sum, s) => sum + s.score, 0);
    const totalQuestions = Object.values(scores).reduce((sum, s) => sum + s.total, 0);
    const overallPercentage = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

    const getScoreColor = (percentage: number) => {
      if (percentage >= 70) return "#22c55e";
      if (percentage >= 40) return "#f59e0b";
      return "#ef4444";
    };

    const getScoreEmoji = (percentage: number) => {
      if (percentage >= 80) return "🏆";
      if (percentage >= 60) return "✅";
      return "⚠️";
    };

    return (
      <ScrollView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <View className="pt-12 pb-8 px-6">
          <Heading size="xl" className="text-center mb-2">
            Test Completed! 🎉
          </Heading>

          {/* Overall Score Ring */}
          <View className="items-center justify-center my-8">
            <View
              className="relative items-center justify-center rounded-full border-8"
              style={{
                width: 160,
                height: 160,
                borderColor: getScoreColor(overallPercentage),
              }}
            >
              <BodyText className="text-5xl font-bold text-center">
                {overallPercentage}%
              </BodyText>
              <BodyText className="text-neutral-500 dark:text-neutral-400">
                {totalScore}/{totalQuestions}
              </BodyText>
            </View>
          </View>

          <BodyText className="text-center text-neutral-500 dark:text-neutral-400 mb-8">
            Here is your performance breakdown by subject.
          </BodyText>

          {subjectsData.map((subject) => {
            const subjectScore = scores[subject.id];
            if (!subjectScore) return null;

            const percentage = subjectScore.total
              ? Math.round((subjectScore.score / subjectScore.total) * 100)
              : 0;

            return (
              <View
                key={subject.id}
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 mb-4"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <Heading size="md">
                    {getScoreEmoji(percentage)} {subject.name}
                  </Heading>
                  <BodyText className="font-semibold">
                    {subjectScore.score}/{subjectScore.total}
                  </BodyText>
                </View>

                {/* Mini progress bar */}
                <View className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: getScoreColor(percentage),
                    }}
                  />
                </View>

                <View className="flex-row justify-between mt-2">
                  <Caption className="text-neutral-500 dark:text-neutral-400">
                    {percentage}% correct
                  </Caption>
                  <Caption className="text-neutral-500 dark:text-neutral-400">
                    {percentage >= 70 ? 'Excellent!' : percentage >= 40 ? 'Good effort!' : 'Keep practicing!'}
                  </Caption>
                </View>
              </View>
            );
          })}

          <Button variant="outline" size="lg" fullWidth onPress={() => setShowReview(!showReview)} className="mb-4">
            {showReview ? "Hide Answer Review" : "Review Answers"}
          </Button>

          {showReview && (
            <View className="mb-6">
              <Heading size="lg" className="mb-4">
                Answer Review
              </Heading>
              {subjectsData.map((subject) => {
                const questions = questionsBySubject[subject.id] ?? [];
                const subjectAnswers = userAnswers[subject.id] ?? {};

                return (
                  <View key={subject.id} className="mb-6">
                    <Heading size="md" className="mb-3 text-primary-700 dark:text-primary-300">
                      {subject.name}
                    </Heading>

                    {questions.map((q, idx) => {
                      const uAnswer = subjectAnswers[idx];
                      const isCorrectAns = q.options.find(o => o.id === uAnswer)?.is_correct;
                      return (
                        <View key={q.id} className="bg-white dark:bg-neutral-900 rounded-xl p-4 mb-4 border border-neutral-200 dark:border-neutral-800">
                          <View className="flex-row justify-between items-center mb-2">
                            <BodyText className="font-bold text-neutral-900 dark:text-neutral-100">Question {idx + 1}</BodyText>
                            <View className={`px-2 py-1 rounded-full ${isCorrectAns ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                              <Caption className={isCorrectAns ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                                {isCorrectAns ? '✅ Correct' : '❌ Incorrect'}
                              </Caption>
                            </View>
                          </View>
                          <AutoHeightWebView html={q.question_text_html || q.question_text} scrollEnabled={false} />

                          <View className="mt-3">
                            {q.options.map((opt) => {
                              const isSelectedOpt = opt.id === uAnswer;
                              const isCorrectOpt = opt.is_correct;
                              let bgColor = "bg-transparent";
                              if (isSelectedOpt && isCorrectOpt) bgColor = "bg-green-50 dark:bg-green-900/20";
                              else if (isSelectedOpt && !isCorrectOpt) bgColor = "bg-red-50 dark:bg-red-900/20";
                              else if (isCorrectOpt) bgColor = "bg-green-50/50 dark:bg-green-900/10";

                              return (
                                <View key={opt.id} className={`p-2 rounded-lg my-1 flex-row items-center ${bgColor}`}>
                                  <View className="flex-1">
                                    {(!opt.option_text_html || !opt.option_text_html.includes('<')) ? (
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

          <Button size="lg" fullWidth onPress={() => router.push("/(tabs)/jamb-setup")}>
            Try Another JAMB Test
          </Button>
          <Button variant="outline" size="lg" fullWidth className="mt-3" onPress={() => router.push("/(tabs)")}>
            Dashboard
          </Button>
        </View>
      </ScrollView>
    );
  }

  const currentQuestion = getCurrentQuestion();
  const currentSubject = subjectsData[currentSubjectIndex];
  const totalAnswered = getTotalAnswered();
  const totalQuestions = getTotalQuestions();
  const progressPercentage = totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0;

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header - No LinearGradient needed */}
      <View
        className={`border-b border-neutral-200 dark:border-neutral-800 ${isDark ? 'bg-neutral-900' : 'bg-white'
          }`}
        style={{ paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1">
            <Heading size="lg" className="text-primary-700 dark:text-primary-300">
              📝 JAMB Practice
            </Heading>
            <Caption className="text-neutral-500 dark:text-neutral-400">
              {currentSubject?.name ?? ""}
            </Caption>
          </View>

          {/* Timer */}
          {timeLimit && timeLimit > 0 && (
            <Animated.View
              className="flex-row items-center bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-full"
              style={{
                transform: [{ scale: timerPulseAnim }],
              }}
            >
              <MaterialIcons
                name="alarm"
                size={18}
                color={timeRemaining < 300 ? "#ef4444" : "#4f46e5"}
                style={{ marginRight: 4 }}
              />
              <BodyText
                className={`font-mono text-base font-bold ${timeRemaining < 300
                  ? "text-red-600 dark:text-red-400"
                  : "text-primary-600 dark:text-primary-400"
                  }`}
              >
                {formatTime(timeRemaining)}
              </BodyText>
            </Animated.View>
          )}
        </View>

        {/* Progress Bar */}
        <View className="mt-1">
          <View className="flex-row justify-between mb-1">
            <Caption className="text-neutral-500 dark:text-neutral-400">
              Progress
            </Caption>
            <Caption className="text-neutral-500 dark:text-neutral-400">
              {totalAnswered}/{totalQuestions}
            </Caption>
          </View>
          <View className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <View
              className="h-full bg-primary-500 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </View>
        </View>
      </View>

      {/* Subject Tabs - Segmented Responsive Row */}
      <View
        className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 py-2.5 flex-row px-3 gap-2"
      >
        {subjectsData.map((subject, index) => {
          const isActive = currentSubjectIndex === index;
          const answered = getAnsweredCount(subject.id);
          const total = questionsBySubject[subject.id]?.length ?? 0;
          const isComplete = answered === total;

          return (
            <TouchableOpacity
              key={subject.id}
              onPress={() => switchSubject(index)}
              className={`flex-1 py-1.5 rounded-xl items-center justify-center border relative ${isActive
                ? "bg-primary-600 border-primary-600 shadow-sm"
                : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                }`}
            >
              <BodyText
                className={`font-semibold text-xs text-center ${isActive ? "text-white" : "text-neutral-700 dark:text-neutral-300"
                  }`}
              >
                {getShortSubjectName(subject.name)}
              </BodyText>
              
              <Caption
                className={`text-[10px] mt-0.5 text-center ${isActive ? "text-white/80 font-medium" : "text-neutral-500 dark:text-neutral-400"
                  }`}
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

      {/* Main Content Body */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 180 }}
        showsVerticalScrollIndicator={false}
      >
        {currentQuestion && (
          <>
            {/* Question Card */}
            <View className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 mb-4">
              {/* Question Header */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="bg-primary-100 dark:bg-primary-900/30 px-3 py-1 rounded-full">
                    <Caption className="text-primary-700 dark:text-primary-300 font-semibold">
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
                <Image
                  source={{ uri: currentQuestion.question_image }}
                  style={{ height: Math.min(200, height * 0.25), marginTop: 12, borderRadius: 8, width: "100%" }}
                  contentFit="contain"
                  transition={200}
                />
              )}
            </View>

            {/* Options */}
            <View className="space-y-3 mb-4">
              {currentQuestion.options.map((option, optIndex) => {
                const subjectId = getCurrentSubjectId();
                const isSelected = userAnswers[subjectId]?.[currentQuestionIndex] === option.id;
                const isAnswered = userAnswers[subjectId]?.[currentQuestionIndex] !== undefined &&
                  userAnswers[subjectId]?.[currentQuestionIndex] !== null;
                const isCorrect = option.is_correct;
                const isCorrectSelected = isSelected && isCorrect;
                const isWrongSelected = isSelected && !isCorrect;

                let borderColor = "border-neutral-200 dark:border-neutral-800";
                let bgColor = "bg-white dark:bg-neutral-900";
                let borderLeftColor = "border-l-transparent";
                let opacity = 1;

                if (isAnswered) {
                  if (isCorrect) {
                    borderColor = "border-green-500/50";
                    bgColor = "bg-green-50 dark:bg-green-900/10";
                    borderLeftColor = "border-l-green-500";
                  } else if (isSelected && !isCorrect) {
                    borderColor = "border-red-500/50";
                    bgColor = "bg-red-50 dark:bg-red-900/10";
                    borderLeftColor = "border-l-red-500";
                  } else if (!isSelected && !isCorrect) {
                    opacity = 0.5;
                  }
                }

                return (
                  <Animated.View
                    key={option.id}
                    style={{
                      transform: [{ scale: isSelected ? scaleAnim : 1 }],
                      opacity: isAnswered && !isSelected && !isCorrect ? 0.6 : 1,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => !isAnswered && selectAnswer(option.id)}
                      disabled={isAnswered}
                      className={`p-4 rounded-2xl border-2 ${borderColor} ${bgColor} border-l-4 ${borderLeftColor}`}
                      activeOpacity={0.7}
                    >
                      <View className="flex-row items-center gap-3">
                        {/* Option Letter Badge */}
                        <View
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isSelected
                            ? isCorrect
                              ? "border-green-500 bg-green-500"
                              : "border-red-500 bg-red-500"
                            : isCorrect && isAnswered
                              ? "border-green-500 bg-green-100 dark:bg-green-900/30"
                              : "border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800"
                            }`}
                        >
                          <BodyText
                            className={`font-bold text-sm ${isSelected || (isCorrect && isAnswered)
                              ? "text-white"
                              : "text-neutral-600 dark:text-neutral-400"
                              }`}
                          >
                            {getOptionLabel(optIndex)}
                          </BodyText>
                        </View>

                        <View className="flex-1">
                          {(!option.option_text_html || !option.option_text_html.includes('<')) ? (
                            <BodyText className="text-neutral-900 dark:text-neutral-100">
                              {option.option_text}
                            </BodyText>
                          ) : (
                            <AutoHeightWebView html={option.option_text_html || option.option_text} scrollEnabled={false} />
                          )}
                        </View>

                        {/* Status Icons */}
                        {isCorrectSelected && (
                          <MaterialIcons name="check-circle" size={24} color="#22c55e" />
                        )}
                        {isWrongSelected && (
                          <MaterialIcons name="cancel" size={24} color="#ef4444" />
                        )}
                        {!isSelected && isCorrect && isAnswered && (
                          <MaterialIcons name="check-circle" size={20} color="#4ade80" />
                        )}
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* Explanation */}
            {userAnswers[getCurrentSubjectId()]?.[currentQuestionIndex] !== undefined &&
              userAnswers[getCurrentSubjectId()]?.[currentQuestionIndex] !== null &&
              currentQuestion.explanation_html && (
                <View className="bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-5 mb-4">
                  <View className="flex-row gap-3">
                    <MaterialIcons name="info" size={20} color="#2563eb" />
                    <View className="flex-1">
                      <BodyText className="font-semibold text-blue-900 dark:text-blue-300 mb-2">💡 Explanation</BodyText>
                      <AutoHeightWebView html={currentQuestion.explanation_html} scrollEnabled={false} />
                    </View>
                  </View>
                </View>
              )}
          </>
        )}
      </ScrollView>

      {/* Fixed Bottom Bar - Merged Navigation and Actions */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800"
        style={{ paddingBottom: insets.bottom + 12, paddingHorizontal: 16, paddingTop: 12 }}
      >
        {/* Navigation Row */}
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity
            onPress={previousQuestion}
            disabled={currentSubjectIndex === 0 && currentQuestionIndex === 0}
            className="w-12 h-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 disabled:opacity-40"
          >
            <MaterialIcons
              name="chevron-left"
              size={28}
              color={isDark ? "#fafafa" : "#171717"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowQuestionNavigator(true)}
            className="flex-row items-center px-4 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-full"
          >
            <BodyText className="text-primary-700 dark:text-primary-300 font-semibold">
              {currentQuestionIndex + 1}/{getCurrentQuestions().length}
            </BodyText>
            <MaterialIcons
              name="expand-more"
              size={20}
              color={isDark ? "#818cf8" : "#4f46e5"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={nextQuestion}
            className="w-12 h-12 items-center justify-center rounded-full bg-primary-600"
          >
            <MaterialIcons
              name="chevron-right"
              size={28}
              color="#ffffff"
            />
          </TouchableOpacity>
        </View>

        {/* Action Buttons Row */}
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={exitQuiz}
            className="flex-1 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 items-center"
          >
            <BodyText className="text-neutral-600 dark:text-neutral-400">
              Exit & Save
            </BodyText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={submitQuiz}
            className="flex-1 py-3 rounded-xl bg-primary-600 items-center"
          >
            <BodyText className="text-white font-semibold">
              Submit Test
            </BodyText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Question Navigator Modal */}
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
              <TouchableOpacity onPress={() => setShowQuestionNavigator(false)} style={{ minHeight: 44, minWidth: 44 }}>
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
                <View className="w-3 h-3 bg-primary-600 rounded-full" />
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
                            ? "bg-primary-600"
                            : isAnswered
                              ? "bg-green-500"
                              : "bg-neutral-100 dark:bg-neutral-800"
                            }`}
                          style={{
                            shadowColor: isCurrent ? "#4f46e5" : isAnswered ? "#22c55e" : "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 2,
                          }}
                        >
                          <BodyText
                            className={`font-semibold ${isCurrent || isAnswered ? "text-white" : "text-neutral-600 dark:text-neutral-400"
                              }`}
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
            <Button variant="outline" size="lg" fullWidth onPress={exitQuiz} style={{ minHeight: 44 }}>
              Exit & Save Progress
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}