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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
        <BodyText className="mt-4 text-neutral-500 dark:text-neutral-400">
          Loading JAMB session...
        </BodyText>
      </View>
    );
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
    return (
      <ScrollView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <View className="pt-16 pb-8 px-6">
          <Heading size="xl" className="text-center mb-2">
            JAMB Test Completed
          </Heading>
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
                <Heading size="md" className="mb-3">
                  {subject.name}
                </Heading>
                <View className="flex-row justify-between mb-2">
                  <BodyText className="text-neutral-500 dark:text-neutral-400">Score</BodyText>
                  <BodyText className="font-semibold">
                    {subjectScore.score}/{subjectScore.total}
                  </BodyText>
                </View>
                <View className="flex-row justify-between">
                  <BodyText className="text-neutral-500 dark:text-neutral-400">Percentage</BodyText>
                  <BodyText className="font-semibold">{percentage}%</BodyText>
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
                                {isCorrectAns ? 'Correct' : 'Incorrect'}
                              </Caption>
                            </View>
                          </View>
                          <AutoHeightWebView html={q.question_text_html || q.question_text} scrollEnabled={false} />
                          
                          <View className="mt-3">
                            {q.options.map(opt => {
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
                                <Caption className="font-bold text-blue-900 dark:text-blue-300 mb-1">Explanation</Caption>
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

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800" style={{ paddingTop: insets.top + 56, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1">
            <Heading size="lg" className="mb-1">
              JAMB Practice Test
            </Heading>
            <Caption className="text-neutral-500 dark:text-neutral-400">
              {currentSubject?.name ?? ""}
            </Caption>
          </View>
          <TouchableOpacity
            onPress={() => setShowQuestionNavigator(true)}
            className="ml-3 px-3 py-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg"
            style={{ minHeight: 44 }}
          >
            <BodyText className="text-primary-600 dark:text-primary-400 font-semibold">
              {getTotalAnswered()}/{getTotalQuestions()}
            </BodyText>
          </TouchableOpacity>
        </View>

        {timeLimit && timeLimit > 0 && (
          <View className="flex-row items-center justify-between">
            <Caption className="text-neutral-500 dark:text-neutral-400">Time Remaining</Caption>
            <BodyText
              className={`font-mono text-xl font-bold ${
                timeRemaining < 600 ? "text-red-600 dark:text-red-400" : "text-primary-600 dark:text-primary-400"
              }`}
            >
              {formatTime(timeRemaining)}
            </BodyText>
          </View>
        )}
      </View>

      {/* Subject Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800"
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {subjectsData.map((subject, index) => {
          const isActive = currentSubjectIndex === index;
          const answered = getAnsweredCount(subject.id);
          const total = questionsBySubject[subject.id]?.length ?? 0;

          return (
            <TouchableOpacity
              key={subject.id}
              onPress={() => switchSubject(index)}
              className={`mr-2 px-4 py-3 rounded-xl border-2 ${
                isActive
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                  : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900"
              }`}
              style={{ minHeight: 44 }}
            >
              <BodyText
                className={`font-semibold text-sm ${
                  isActive ? "text-primary-700 dark:text-primary-300" : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                {subject.name}
              </BodyText>
              <Caption
                className={`text-xs ${
                  isActive ? "text-primary-600 dark:text-primary-400" : "text-neutral-500 dark:text-neutral-400"
                }`}
              >
                {answered}/{total}
              </Caption>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Main Content */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 280 + insets.bottom }}
      >
        {currentQuestion && (
          <>
            {/* Question Card */}
            <View className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 mb-4">
              <AutoHeightWebView
                html={currentQuestion.question_text_html || currentQuestion.question_text}
                scrollEnabled={false}
              />
              {currentQuestion.question_image && (
                <WebView
                  source={{ uri: currentQuestion.question_image }}
                  style={{ height: 200, marginTop: 12, borderRadius: 8 }}
                />
              )}
            </View>

            {/* Options */}
            <View className="space-y-3 mb-4">
              {currentQuestion.options.map((option) => {
                const subjectId = getCurrentSubjectId();
                const isSelected = userAnswers[subjectId]?.[currentQuestionIndex] === option.id;
                const isAnswered = userAnswers[subjectId]?.[currentQuestionIndex] !== undefined && userAnswers[subjectId]?.[currentQuestionIndex] !== null;
                const isCorrect = option.is_correct;

                let borderColor = "border-neutral-200 dark:border-neutral-800";
                let bgColor = "bg-white dark:bg-neutral-900";

                if (isAnswered) {
                  if (isSelected && isCorrect) {
                    borderColor = "border-green-500";
                    bgColor = "bg-green-50 dark:bg-green-900/20";
                  } else if (isSelected && !isCorrect) {
                    borderColor = "border-red-500";
                    bgColor = "bg-red-50 dark:bg-red-900/20";
                  } else if (!isSelected && isCorrect) {
                    borderColor = "border-green-400";
                    bgColor = "bg-green-50/50 dark:bg-green-900/10";
                  }
                }

                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => !isAnswered && selectAnswer(option.id)}
                    disabled={isAnswered}
                    className={`p-4 rounded-2xl border-2 ${borderColor} ${bgColor}`}
                    style={{ opacity: isAnswered && !isSelected ? 0.6 : 1 }}
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                          isSelected && isCorrect
                            ? "border-green-500 bg-green-500"
                            : isSelected && !isCorrect
                            ? "border-red-500 bg-red-500"
                            : !isSelected && isCorrect
                            ? "border-green-400 bg-green-400"
                            : "border-neutral-300 dark:border-neutral-700"
                        }`}
                      >
                        {isSelected && <View className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </View>
                      <View className="flex-1">
                        {(!option.option_text_html || !option.option_text_html.includes('<')) ? (
                          <BodyText className={isSelected ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'}>{option.option_text}</BodyText>
                        ) : (
                          <AutoHeightWebView html={option.option_text_html || option.option_text} scrollEnabled={false} />
                        )}
                      </View>
                      {isSelected && isCorrect && (
                        <MaterialIcons name="check-circle" size={20} color="#22c55e" />
                      )}
                      {isSelected && !isCorrect && (
                        <MaterialIcons name="cancel" size={20} color="#ef4444" />
                      )}
                      {!isSelected && isCorrect && isAnswered && (
                        <MaterialIcons name="check-circle" size={20} color="#4ade80" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Explanation */}
            {userAnswers[getCurrentSubjectId()]?.[currentQuestionIndex] !== null &&
              currentQuestion.explanation_html && (
                <View className="bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-5 mb-4">
                  <View className="flex-row gap-3">
                    <MaterialIcons name="info" size={20} color="#2563eb" />
                    <View className="flex-1">
                      <BodyText className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                        Explanation
                      </BodyText>
                      <AutoHeightWebView
                        html={currentQuestion.explanation_html}
                        scrollEnabled={false}
                      />
                    </View>
                  </View>
                </View>
              )}
          </>
        )}

        {/* Navigation Buttons - Positioned after options for better accessibility */}
        <View className="mt-4 pb-6 bg-white dark:bg-neutral-900">
          <View className="flex-row items-center justify-between">
            <Button
              variant="outline"
              size="md"
              onPress={previousQuestion}
              disabled={currentSubjectIndex === 0 && currentQuestionIndex === 0}
              style={{ minHeight: 44, minWidth: 110 }}
            >
              ← Previous
            </Button>
            <Caption className="text-neutral-500 dark:text-neutral-400">
              {currentQuestionIndex + 1}/{getCurrentQuestions().length}
            </Caption>
            <Button variant="primary" size="md" onPress={nextQuestion} style={{ minHeight: 44, minWidth: 110 }}>
              Next →
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar - Fixed at bottom */}
      <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800" style={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 16, paddingTop: 16 }}>
        <View className="flex-row items-center justify-between gap-3">
          <Button variant="outline" size="md" onPress={exitQuiz} style={{ flex: 1, minHeight: 44 }}>
            Exit & Save
          </Button>
          <Button variant="primary" size="md" onPress={submitQuiz} style={{ flex: 1, minHeight: 44 }}>
            Submit
          </Button>
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
          <View className="border-b border-neutral-200 dark:border-neutral-800" style={{ paddingTop: insets.top + 56, paddingBottom: 16, paddingHorizontal: 16 }}>
            <View className="flex-row items-center justify-between">
              <Heading size="lg">Questions</Heading>
              <TouchableOpacity onPress={() => setShowQuestionNavigator(false)} style={{ minHeight: 44 }}>
                <MaterialIcons name="close" size={24} color={isDark ? "#fafafa" : "#171717"} />
              </TouchableOpacity>
            </View>
            <Caption className="mt-2 text-neutral-500 dark:text-neutral-400">
              Answered: {getTotalAnswered()}/{getTotalQuestions()}
            </Caption>
          </View>

          <ScrollView className="flex-1 p-4">
            {subjectsData.map((subject, subjectIndex) => {
              const questions = questionsBySubject[subject.id] ?? [];
              const subjectAnswers = userAnswers[subject.id] ?? {};

              return (
                <View key={subject.id} className="mb-6">
                  <Heading size="md" className="mb-3">
                    {subject.name}
                  </Heading>
                  <View className="flex-row flex-wrap gap-2">
                    {questions.map((_, questionIndex) => {
                      const isAnswered = subjectAnswers[questionIndex] !== undefined && subjectAnswers[questionIndex] !== null;
                      const isCurrent =
                        currentSubjectIndex === subjectIndex && currentQuestionIndex === questionIndex;

                      return (
                        <TouchableOpacity
                          key={questionIndex}
                          onPress={() => jumpToQuestion(subjectIndex, questionIndex)}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isCurrent
                              ? "bg-primary-600"
                              : isAnswered
                              ? "bg-green-500"
                              : "bg-neutral-100 dark:bg-neutral-800"
                          }`}
                        >
                          <BodyText
                            className={`font-semibold ${
                              isCurrent || isAnswered ? "text-white" : "text-neutral-600 dark:text-neutral-400"
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

          <View className="border-t border-neutral-200 dark:border-neutral-800" style={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 16, paddingTop: 16 }}>
            <Button variant="outline" size="lg" fullWidth onPress={exitQuiz} style={{ minHeight: 44 }}>
              Exit & Save Progress
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}
