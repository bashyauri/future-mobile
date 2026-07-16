import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
  Platform,
  useWindowDimensions,
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

const PracticeQuizScreen = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [allQuestionIds, setAllQuestionIds] = useState<number[]>([]);
  const [loadedUpToIndex, setLoadedUpToIndex] = useState(0);
  const [isFetchingBatch, setIsFetchingBatch] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showResults, setShowResults] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [score, setScore] = useState(0);
  const [showQuestionNavigator, setShowQuestionNavigator] = useState(false);

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

        const response = await api.get(`/practice/load/${id}`);
        const data = response.data?.data ?? response.data;

        if (!data?.attempt_id) {
          throw new Error("Practice attempt could not be loaded.");
        }

        setAttemptId(data.attempt_id);
        setTotalQuestions(data.total_questions ?? null);
        setTimeLimit(data.time_limit ?? null);
        setCurrentQuestionIndex(data.current_question_index ?? 0);
        setQuestions(data.questions ?? []);
        setAllQuestionIds(data.all_question_ids ?? []);
        setLoadedUpToIndex(
          data.loaded_up_to_index ?? (data.questions?.length ?? 1) - 1,
        );
        // Ensure user_answers is properly initialized - only include non-null answers
        const answers = data.user_answers ?? {};
        if (Array.isArray(answers)) {
          // Convert array to object, but skip null values (unanswered questions)
          const answerObj: Record<number, number> = {};
          answers.forEach((val, idx) => {
            if (val !== null && val !== undefined) {
              answerObj[idx] = val;
            }
          });
          setUserAnswers(answerObj);
        } else {
          setUserAnswers(answers);
        }

        if (data.time_limit && data.time_limit > 0) {
          const elapsed = data.elapsed_seconds ?? 0;
          setTimeRemaining(data.time_limit * 60 - elapsed);
        }

        await storage.setItem(`practice_attempt_${id}`, JSON.stringify(data));
      } catch (e: any) {
        setError(
          e?.response?.data?.message ??
            e?.message ??
            "Failed to load practice attempt.",
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
  }, [showResults, attemptId, userAnswers, currentQuestionIndex]);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const selectAnswer = (optionId: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optionId,
    }));
  };

  const loadMoreQuestions = async (upToIndex: number) => {
    if (isFetchingBatch || allQuestionIds.length === 0) return;
    if (upToIndex <= loadedUpToIndex) return;

    const batchEnd = Math.min(upToIndex + 4, allQuestionIds.length - 1);
    const idsToLoad = allQuestionIds.slice(loadedUpToIndex + 1, batchEnd + 1);

    if (idsToLoad.length === 0) return;

    setIsFetchingBatch(true);
    try {
      const response = await api.post("/practice/load-batch", {
        question_ids: idsToLoad,
      });
      const newQuestions: Question[] = response.data?.questions ?? [];
      if (newQuestions.length > 0) {
        setQuestions((prev) => [...prev, ...newQuestions]);
        setLoadedUpToIndex(batchEnd);
      }
    } catch (err) {
      console.error("Failed to load question batch:", err);
    } finally {
      setIsFetchingBatch(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < (totalQuestions ?? 1) - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      // Load more when within 2 questions of the loaded boundary
      if (nextIndex >= loadedUpToIndex - 1) {
        loadMoreQuestions(nextIndex);
      }
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const autosave = async () => {
    if (!attemptId) return;

    try {
      await api.post("/practice/save", {
        attempt_id: attemptId,
        answers: userAnswers,
        current_question_index: currentQuestionIndex,
        all_question_ids:
          allQuestionIds.length > 0
            ? allQuestionIds
            : questions.map((q) => q.id),
        questions: questions,
        loaded_up_to_index: loadedUpToIndex,
        time_limit: timeLimit,
      });
    } catch (error) {
      console.error("Autosave failed:", error);
    }
  };

  const handleTimerExpired = () => {
    Alert.alert(
      "Time Expired",
      "Your time has expired. Submitting your quiz...",
      [
        {
          text: "OK",
          onPress: () => submitQuiz(),
        },
      ],
    );
  };

  const submitQuiz = async () => {
    const answered = Object.values(userAnswers).filter(
      (a) => a !== null,
    ).length;

    Alert.alert(
      "Submit Quiz",
      `You have answered ${answered} out of ${totalQuestions} questions. Once submitted, you won't be able to change your answers.`,
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
              const response = await api.post("/practice/submit", {
                attempt_id: attemptId,
                answers: userAnswers,
                all_question_ids: questions.map((q) => q.id),
              });

              setScore(response.data?.score ?? 0);
              setShowResults(true);

              if (timerRef.current) clearInterval(timerRef.current);
              if (autosaveTimerRef.current)
                clearInterval(autosaveTimerRef.current);

              await storage.deleteItem(`practice_attempt_${id}`);
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.response?.data?.message ?? "Failed to submit quiz",
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
    const answered = Object.values(userAnswers).filter(
      (a) => a !== null,
    ).length;

    Alert.alert(
      "Exit & Save Progress",
      `Your progress will be saved and you can continue this practice exam later.\n\nCurrent progress: ${answered} of ${totalQuestions} questions answered.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Exit",
          onPress: async () => {
            try {
              await api.post("/practice/exit", {
                attempt_id: attemptId,
                answers: userAnswers,
                current_question_index: currentQuestionIndex,
                all_question_ids: questions.map((q) => q.id),
              });
              router.back();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.response?.data?.message ?? "Failed to exit quiz",
              );
            }
          },
        },
      ],
    );
  };

  const getCurrentQuestion = (): Question | null => {
    return questions[currentQuestionIndex] ?? null;
  };

  const getAnsweredCount = (): number => {
    return Object.values(userAnswers).filter(
      (a) => a !== null && a !== undefined,
    ).length;
  };

  const jumpToQuestion = (index: number) => {
    if (index >= 0 && index < (totalQuestions ?? 0)) {
      setCurrentQuestionIndex(index);
      setShowQuestionNavigator(false);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      // Load batch if jumping to an unloaded question
      if (index >= loadedUpToIndex - 1) {
        loadMoreQuestions(index);
      }
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
        <BodyText className="mt-4 text-neutral-500 dark:text-neutral-400">
          Loading practice session...
        </BodyText>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-8">
        <MaterialIcons name="error-outline" size={48} color="#ef4444" />
        <BodyText className="mt-4 text-center text-red-500">{error}</BodyText>
        <Button
          variant="outline"
          size="md"
          style={{ marginTop: 16 }}
          onPress={() => router.back()}
        >
          Go Back
        </Button>
      </View>
    );
  }

  if (showResults) {
    const percentage = totalQuestions
      ? Math.round((score / totalQuestions) * 100)
      : 0;
    const status =
      percentage >= 70
        ? "Excellent"
        : percentage >= 50
          ? "Good"
          : "Keep Trying";

    return (
      <ScrollView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <View className="pt-16 pb-8 px-6">
          <Heading size="xl" className="text-center mb-2">
            Practice Completed
          </Heading>
          <BodyText className="text-center text-neutral-500 dark:text-neutral-400 mb-8">
            Here is your performance breakdown.
          </BodyText>

          <View className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 mb-6">
            <View className="flex-row justify-between mb-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
              <BodyText className="text-green-600 dark:text-green-400">
                Score
              </BodyText>
              <BodyText className="font-semibold text-green-700 dark:text-green-300">
                {score}/{totalQuestions}
              </BodyText>
            </View>
            <View className="flex-row justify-between mb-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
              <BodyText className="text-blue-600 dark:text-blue-400">
                Percentage
              </BodyText>
              <BodyText className="font-semibold text-blue-700 dark:text-blue-300">
                {percentage}%
              </BodyText>
            </View>
            <View className="flex-row justify-between">
              <BodyText className="text-amber-600 dark:text-amber-400">
                Status
              </BodyText>
              <BodyText className="font-semibold text-amber-700 dark:text-amber-300">
                {status}
              </BodyText>
            </View>
          </View>

          <Button
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => setShowReview(!showReview)}
            className="mb-4"
          >
            {showReview ? "Hide Answer Review" : "Review Answers"}
          </Button>

          {showReview && (
            <View className="mb-6">
              <Heading size="lg" className="mb-4">
                Answer Review
              </Heading>
              {questions.map((q, idx) => {
                const uAnswer = userAnswers[idx];
                const isCorrectAns = q.options.find(
                  (o) => o.id === uAnswer,
                )?.is_correct;
                return (
                  <View
                    key={q.id}
                    className="bg-white dark:bg-neutral-900 rounded-xl p-4 mb-4 border border-neutral-200 dark:border-neutral-800"
                  >
                    <View className="flex-row justify-between items-center mb-2">
                      <BodyText className="font-bold text-neutral-900 dark:text-neutral-100">
                        Question {idx + 1}
                      </BodyText>
                      <View
                        className={`px-2 py-1 rounded-full ${isCorrectAns ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}
                      >
                        <Caption
                          className={
                            isCorrectAns
                              ? "text-green-700 dark:text-green-400"
                              : "text-red-700 dark:text-red-400"
                          }
                        >
                          {isCorrectAns ? "Correct" : "Incorrect"}
                        </Caption>
                      </View>
                    </View>
                    <AutoHeightWebView
                      html={q.question_text_html || q.question_text}
                      scrollEnabled={false}
                      minHeight={120}
                    />

                    <View className="mt-3">
                      {q.options.map((opt) => {
                        const isSelectedOpt = opt.id === uAnswer;
                        const isCorrectOpt = opt.is_correct;
                        let bgColor = "bg-transparent";
                        if (isSelectedOpt && isCorrectOpt)
                          bgColor = "bg-green-50 dark:bg-green-900/20";
                        else if (isSelectedOpt && !isCorrectOpt)
                          bgColor = "bg-red-50 dark:bg-red-900/20";
                        else if (isCorrectOpt)
                          bgColor = "bg-green-50/50 dark:bg-green-900/10";

                        return (
                          <View
                            key={opt.id}
                            className={`p-2 rounded-lg my-1 flex-row items-center ${bgColor}`}
                          >
                            <View className="flex-1">
                              {!opt.option_text_html ||
                              !opt.option_text_html.includes("<") ? (
                                <BodyText className="text-neutral-700 dark:text-neutral-300">
                                  {opt.option_text}
                                </BodyText>
                              ) : (
                                <AutoHeightWebView
                                  html={opt.option_text_html || opt.option_text}
                                  scrollEnabled={false}
                                />
                              )}
                            </View>
                            {isSelectedOpt && isCorrectOpt && (
                              <MaterialIcons
                                name="check-circle"
                                size={16}
                                color="#22c55e"
                              />
                            )}
                            {isSelectedOpt && !isCorrectOpt && (
                              <MaterialIcons
                                name="cancel"
                                size={16}
                                color="#ef4444"
                              />
                            )}
                            {!isSelectedOpt && isCorrectOpt && (
                              <MaterialIcons
                                name="check-circle"
                                size={16}
                                color="#4ade80"
                              />
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {q.explanation_html && (
                      <View className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <Caption className="font-bold text-blue-900 dark:text-blue-300 mb-1">
                          Explanation
                        </Caption>
                        <AutoHeightWebView
                          html={q.explanation_html}
                          scrollEnabled={false}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <Button
            size="lg"
            fullWidth
            onPress={() => router.push("/(tabs)/practice-setup")}
          >
            Try Another Practice
          </Button>
          <Button
            variant="outline"
            size="lg"
            fullWidth
            className="mt-3"
            onPress={() => router.push("/(tabs)")}
          >
            Dashboard
          </Button>
        </View>
      </ScrollView>
    );
  }

  const currentQuestion = getCurrentQuestion();

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View
        className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800"
        style={{
          paddingTop: insets.top + 56,
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}
      >
        <View className="flex-row items-center justify-between mb-3">
          {/* Exit button — navigation action lives in the header */}
          <TouchableOpacity
            onPress={exitQuiz}
            className="mr-3 w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            style={{ minHeight: 44, minWidth: 44 }}
            accessibilityLabel="Exit and save progress"
          >
            <MaterialIcons
              name="close"
              size={20}
              color={isDark ? "#a3a3a3" : "#525252"}
            />
          </TouchableOpacity>

          <View className="flex-1">
            <Heading size="lg" className="mb-1">
              Practice Exam
            </Heading>
            <Caption className="text-neutral-500 dark:text-neutral-400">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </Caption>
          </View>

          <TouchableOpacity
            onPress={() => setShowQuestionNavigator(true)}
            className="ml-3 px-3 py-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg"
            style={{ minHeight: 44 }}
          >
            <BodyText className="text-primary-600 dark:text-primary-400 font-semibold">
              {getAnsweredCount()}/{totalQuestions}
            </BodyText>
          </TouchableOpacity>
        </View>

        {timeLimit && timeLimit > 0 && (
          <View className="flex-row items-center justify-between">
            <Caption className="text-neutral-500 dark:text-neutral-400">
              Time Remaining
            </Caption>
            <BodyText
              className={`font-mono text-xl font-bold ${
                timeRemaining < 600
                  ? "text-red-600 dark:text-red-400"
                  : "text-primary-600 dark:text-primary-400"
              }`}
            >
              {formatTime(timeRemaining)}
            </BodyText>
          </View>
        )}
      </View>

      {/* Main Content */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
      >
        {!currentQuestion && isFetchingBatch && (
          <View className="items-center justify-center py-16">
            <ActivityIndicator size="large" color="#4f46e5" />
            <BodyText className="mt-3 text-neutral-500 dark:text-neutral-400">
              Loading question...
            </BodyText>
          </View>
        )}

        {currentQuestion && (
          <>
            {/* Question Card */}
            <View className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 mb-4">
              <AutoHeightWebView
                html={
                  currentQuestion.question_text_html ||
                  currentQuestion.question_text
                }
                scrollEnabled={true}
              />
              {currentQuestion.question_image && (
                <Image
                  source={{ uri: currentQuestion.question_image }}
                  style={{ height: 200, marginTop: 12, borderRadius: 8, width: "100%" }}
                  contentFit="contain"
                  transition={200}
                />
              )}
            </View>

            {/* Options */}
            <View className="space-y-3 mb-4">
              {currentQuestion.options.map((option, index) => {
                const isSelected =
                  userAnswers[currentQuestionIndex] === option.id;
                const isAnswered =
                  userAnswers[currentQuestionIndex] !== undefined &&
                  userAnswers[currentQuestionIndex] !== null;
                const isCorrect = option.is_correct;

                let borderColor = "border-neutral-200 dark:border-neutral-800";
                let bgColor = "bg-white dark:bg-neutral-900";
                let textColor = "text-neutral-900 dark:text-neutral-100";

                if (isAnswered) {
                  if (isSelected && isCorrect) {
                    borderColor = "border-green-500";
                    bgColor = "bg-green-50 dark:bg-green-900/20";
                    textColor = "text-green-700 dark:text-green-300";
                  } else if (isSelected && !isCorrect) {
                    borderColor = "border-red-500";
                    bgColor = "bg-red-50 dark:bg-red-900/20";
                    textColor = "text-red-700 dark:text-red-300";
                  } else if (!isSelected && isCorrect) {
                    borderColor = "border-green-400";
                    bgColor = "bg-green-50/50 dark:bg-green-900/10";
                    textColor = "text-green-600 dark:text-green-400";
                  } else {
                    borderColor = "border-neutral-200 dark:border-neutral-800";
                    bgColor = "bg-white dark:bg-neutral-900";
                    textColor = "text-neutral-600 dark:text-neutral-400";
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
                              : !isSelected && isCorrect && isAnswered
                                ? "border-green-400 bg-green-400"
                                : "border-neutral-300 dark:border-neutral-700"
                        }`}
                      >
                        {isSelected && (
                          <View className="w-2.5 h-2.5 bg-white rounded-full" />
                        )}
                      </View>
                      <View className="flex-1">
                        {!option.option_text_html ||
                        !option.option_text_html.includes("<") ? (
                          <BodyText className={textColor}>
                            {option.option_text}
                          </BodyText>
                        ) : (
                          <AutoHeightWebView
                            html={option.option_text_html || option.option_text}
                            scrollEnabled={false}
                          />
                        )}
                      </View>
                      {isSelected && isCorrect && (
                        <MaterialIcons
                          name="check-circle"
                          size={20}
                          color="#22c55e"
                        />
                      )}
                      {isSelected && !isCorrect && (
                        <MaterialIcons
                          name="cancel"
                          size={20}
                          color="#ef4444"
                        />
                      )}
                      {!isSelected && isCorrect && isAnswered && (
                        <MaterialIcons
                          name="check-circle"
                          size={20}
                          color="#4ade80"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Explanation */}
            {userAnswers[currentQuestionIndex] !== undefined &&
              userAnswers[currentQuestionIndex] !== null &&
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
              disabled={currentQuestionIndex === 0}
              style={{ minHeight: 44, minWidth: 110 }}
            >
              ← Previous
            </Button>
            <Caption className="text-neutral-500 dark:text-neutral-400">
              {currentQuestionIndex + 1}/{totalQuestions}
            </Caption>
            <Button
              variant="primary"
              size="md"
              onPress={nextQuestion}
              style={{ minHeight: 44, minWidth: 110 }}
            >
              Next →
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar - Submit only */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800"
        style={{
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 16,
          paddingTop: 16,
        }}
      >
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={submitQuiz}
          style={{ minHeight: 52 }}
        >
          Submit Quiz
        </Button>
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
            style={{
              paddingTop: insets.top + 56,
              paddingBottom: 16,
              paddingHorizontal: 16,
            }}
          >
            <View className="flex-row items-center justify-between">
              <Heading size="lg">Questions</Heading>
              <TouchableOpacity
                onPress={() => setShowQuestionNavigator(false)}
                style={{ minHeight: 44 }}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color={isDark ? "#fafafa" : "#171717"}
                />
              </TouchableOpacity>
            </View>
            <Caption className="mt-2 text-neutral-500 dark:text-neutral-400">
              Answered: {getAnsweredCount()}/{totalQuestions}
            </Caption>
          </View>

          <ScrollView className="flex-1 p-4">
            <View className="flex-row flex-wrap gap-2">
              {Array.from({ length: totalQuestions ?? 0 }).map((_, i) => {
                const isAnswered =
                  userAnswers[i] !== undefined && userAnswers[i] !== null;
                const isCurrent = currentQuestionIndex === i;

                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => jumpToQuestion(i)}
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
                        isCurrent || isAnswered
                          ? "text-white"
                          : "text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {i + 1}
                    </BodyText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default PracticeQuizScreen;
