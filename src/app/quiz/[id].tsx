import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  useWindowDimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import { Heading, BodyText, Caption } from "@/components/Typography";
import { Button } from "@/components";
import { AutoHeightWebView } from "@/components/AutoHeightWebView";
import api from "@/lib/api";

type Option = {
  id: number;
  label?: string;
  option_text: string;
  option_text_html?: string;
  is_correct?: boolean;
};

type Question = {
  id: number;
  question_text: string;
  question_text_html?: string;
  question_image?: string | null;
  explanation?: string | null;
  explanation_html?: string | null;
  options: Option[];
};

type QuizDetails = {
  id: number;
  title: string;
  description: string;
  type: string;
  duration_minutes: number;
  question_count: number;
  lesson_id?: number | null;
  questions: Question[];
};

type SubmitResponse = {
  attempt_id: number;
  score_percentage: number;
  correct_answers: number;
  total_questions: number;
  passed: boolean;
  time_taken_seconds: number;
};

type DetailedReviewAnswer = {
  question_id: number;
  question_text: string;
  question_text_html: string;
  selected_option_id: number | null;
  selected_option_label: string | null;
  is_correct: boolean;
  explanation: string | null;
  explanation_html: string | null;
  options: Option[];
};

type DetailedReview = {
  id: number;
  score_percentage: number;
  correct_answers: number;
  total_questions: number;
  passed: boolean;
  time_taken_seconds: number;
  answers: DetailedReviewAnswer[];
};

export default function QuizPlayerScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const { id } = useLocalSearchParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [orderedQuestions, setOrderedQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const [showResults, setShowResults] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [scoreData, setScoreData] = useState<SubmitResponse | null>(null);

  const [showReview, setShowReview] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [detailedResults, setDetailedResults] = useState<DetailedReview | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load quiz details and start attempt
  useEffect(() => {
    const initQuiz = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!id) {
          setError("Quiz ID is required");
          return;
        }

        // 1. Fetch Quiz Details
        const quizRes = await api.get(`/quizzes/${id}`);
        const quizData = quizRes.data?.data ?? quizRes.data;
        setQuiz(quizData);

        // 2. Start Quiz Attempt
        const startRes = await api.post(`/quizzes/${id}/start`, {
          shuffle: false,
        });
        const startData = startRes.data?.data ?? startRes.data;
        setAttemptId(startData.attempt_id);

        // 3. Arrange questions by startData.question_order
        const order: number[] = startData.question_order ?? [];
        const rawQuestions: Question[] = quizData.questions ?? [];

        let sorted: Question[] = [];
        if (order.length > 0) {
          sorted = order
            .map((qId) => rawQuestions.find((q) => q.id === qId))
            .filter((q): q is Question => !!q);
        } else {
          sorted = rawQuestions;
        }

        setOrderedQuestions(sorted);

        // 4. Setup timer if timed
        if (quizData.duration_minutes && quizData.duration_minutes > 0) {
          setTimeRemaining(quizData.duration_minutes * 60);
        }
      } catch (e: any) {
        setError(
          e?.response?.data?.message ??
            e?.message ??
            "Failed to load quiz attempt.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    initQuiz();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  // Handle timer countdown
  useEffect(() => {
    if (quiz && quiz.duration_minutes > 0 && timeRemaining > 0 && !showResults) {
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
  }, [quiz, timeRemaining, showResults]);

  const handleTimerExpired = () => {
    Alert.alert(
      "Time Expired",
      "Your time has expired. Submitting your quiz now...",
      [
        {
          text: "OK",
          onPress: () => submitQuizDirectly(),
        },
      ],
      { cancelable: false }
    );
  };

  const formatTimerValue = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const selectOption = (optionId: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optionId,
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < orderedQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const getAnsweredCount = (): number => {
    return Object.keys(userAnswers).length;
  };

  const submitQuizConfirm = () => {
    const total = orderedQuestions.length;
    const answered = getAnsweredCount();

    Alert.alert(
      "Submit Quiz",
      `You answered ${answered} of ${total} questions. Are you sure you want to submit?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: submitQuizDirectly,
        },
      ]
    );
  };

  const submitQuizDirectly = async () => {
    if (!attemptId) return;

    try {
      setResultsLoading(true);
      if (timerRef.current) clearInterval(timerRef.current);

      // Build answers payload
      const payload = {
        answers: orderedQuestions.map((q, idx) => {
          const optId = userAnswers[idx];
          return {
            question_id: q.id,
            option_id: optId ?? 0, // Fallback if unanswered (backend requires an option_id or skips)
            time_spent_seconds: 0,
          };
        }).filter(a => a.option_id > 0), // Filter out unanswered questions
      };

      const response = await api.post(`/quiz-attempts/${attemptId}/submit`, payload);
      const data = response.data?.data ?? response.data;
      setScoreData(data);
      setShowResults(true);
    } catch (e: any) {
      Alert.alert(
        "Error Submitting",
        e?.response?.data?.message ?? e?.message ?? "Failed to submit answers."
      );
    } finally {
      setResultsLoading(false);
    }
  };

  const loadDetailedReview = async () => {
    if (!attemptId || detailedResults) return;

    try {
      setReviewLoading(true);
      const res = await api.get(`/quiz-attempts/${attemptId}/results`);
      const data = res.data?.data ?? res.data;
      setDetailedResults(data);
    } catch (e: any) {
      Alert.alert("Error Loading Review", e?.message ?? "Failed to load review.");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleToggleReview = async () => {
    if (!showReview) {
      await loadDetailedReview();
    }
    setShowReview(!showReview);
  };

  const handleExit = () => {
    Alert.alert(
      "Exit Quiz",
      "Are you sure you want to exit? Your progress on this attempt will be saved.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Exit", onPress: () => router.back() },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
        <BodyText className="mt-4 text-neutral-500">Preparing your quiz...</BodyText>
      </View>
    );
  }

  if (error || !quiz) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-6">
        <MaterialIcons name="error-outline" size={48} color="#ef4444" />
        <BodyText className="mt-4 text-center text-neutral-700 dark:text-neutral-300">
          {error || "Unable to start quiz."}
        </BodyText>
        <Button variant="outline" size="md" onPress={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </View>
    );
  }

  // --- Results Screen ---
  if (showResults) {
    const percentage = scoreData ? Math.round(scoreData.score_percentage) : 0;
    const passed = scoreData?.passed ?? false;

    return (
      <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        {/* Header */}
        <View
          className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800"
          style={{ paddingTop: insets.top + 16, paddingBottom: 16, paddingHorizontal: 16 }}
        >
          <Heading size="lg" className="text-center">Results</Heading>
        </View>

        <ScrollView
          className="flex-1 px-4 pt-6"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="items-center mb-6">
            <View className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${passed ? "bg-green-100 dark:bg-green-950/30" : "bg-amber-100 dark:bg-amber-950/30"}`}>
              <MaterialIcons
                name={passed ? "check-circle" : "error"}
                size={56}
                color={passed ? "#22c55e" : "#eab308"}
              />
            </View>
            <Heading size="xl" className="text-center mb-1">
              {passed ? "Congratulations!" : "Keep Studying!"}
            </Heading>
            <BodyText className="text-neutral-500 text-center">
              {passed ? "You passed this quiz attempt." : "You did not achieve the passing score."}
            </BodyText>
          </View>

          {/* Metrics Card */}
          <View className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 mb-4">
            <View className="flex-row justify-between mb-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <BodyText className="text-neutral-500">Correct Answers</BodyText>
              <BodyText className="font-bold text-neutral-800 dark:text-neutral-200">
                {scoreData?.correct_answers} / {scoreData?.total_questions}
              </BodyText>
            </View>
            <View className="flex-row justify-between mb-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <BodyText className="text-neutral-500">Score Percentage</BodyText>
              <BodyText className={`font-bold ${passed ? "text-green-600" : "text-amber-600"}`}>
                {percentage}%
              </BodyText>
            </View>
            <View className="flex-row justify-between">
              <BodyText className="text-neutral-500">Result Status</BodyText>
              <View className={`px-3 py-0.5 rounded-full ${passed ? "bg-green-100 dark:bg-green-950/30" : "bg-amber-100 dark:bg-amber-950/30"}`}>
                <Caption className={`font-bold ${passed ? "text-green-600" : "text-amber-600"}`}>
                  {passed ? "PASSED" : "FAILED"}
                </Caption>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onPress={handleToggleReview}
            className="mb-3"
            style={{ minHeight: 48 }}
          >
            {reviewLoading ? (
              <ActivityIndicator size="small" color="#4f46e5" />
            ) : (
              `${showReview ? "Hide" : "Review"} Detailed Answers`
            )}
          </Button>

          {/* Review List */}
          {showReview && detailedResults && (
            <View className="mb-6 space-y-4">
              <Heading size="md" className="mb-2">Answer Breakdown</Heading>
              {detailedResults.answers.map((ans, idx) => (
                <View
                  key={ans.question_id}
                  className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
                >
                  <View className="flex-row justify-between items-center mb-3">
                    <Caption className="font-bold text-neutral-500">Question {idx + 1}</Caption>
                    <View className={`px-2.5 py-0.5 rounded-full ${ans.is_correct ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                      <Caption className={ans.is_correct ? "text-green-600" : "text-red-600"}>
                        {ans.is_correct ? "Correct" : "Incorrect"}
                      </Caption>
                    </View>
                  </View>

                  <AutoHeightWebView
                    html={ans.question_text_html || ans.question_text}
                    scrollEnabled={false}
                    minHeight={80}
                  />

                  {/* Options Review */}
                  <View className="mt-3 space-y-2">
                    {ans.options.map((opt) => {
                      const isSelected = ans.selected_option_id === opt.id;
                      const isCorrectOpt = opt.is_correct;

                      let bgColor = "bg-transparent";
                      let borderColor = "border-neutral-200 dark:border-neutral-800";
                      let iconName = "";
                      let iconColor = "";

                      if (isCorrectOpt) {
                        bgColor = "bg-green-50 dark:bg-green-950/20";
                        borderColor = "border-green-500";
                        iconName = "check-circle";
                        iconColor = "#22c55e";
                      } else if (isSelected && !isCorrectOpt) {
                        bgColor = "bg-red-50 dark:bg-red-950/20";
                        borderColor = "border-red-500";
                        iconName = "cancel";
                        iconColor = "#ef4444";
                      }

                      return (
                        <View
                          key={opt.id}
                          className={`flex-row items-center border p-3 rounded-xl ${bgColor} ${borderColor}`}
                        >
                          <View className="flex-1">
                            {!opt.option_text_html || !opt.option_text_html.includes("<") ? (
                              <BodyText className="text-neutral-700 dark:text-neutral-300">
                                {opt.option_text}
                              </BodyText>
                            ) : (
                              <AutoHeightWebView
                                html={opt.option_text_html}
                                scrollEnabled={false}
                                minHeight={40}
                              />
                            )}
                          </View>
                          {iconName && (
                            <MaterialIcons name={iconName as any} size={20} color={iconColor} />
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Explanation */}
                  {(ans.explanation_html || ans.explanation) && (
                    <View className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-800">
                      <Caption className="font-bold text-blue-900 dark:text-blue-300 mb-1">Explanation</Caption>
                      <AutoHeightWebView
                        html={ans.explanation_html || ans.explanation || ""}
                        scrollEnabled={false}
                        minHeight={60}
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.back()}
            style={{ minHeight: 48 }}
          >
            {quiz.lesson_id ? 'Return to Lesson' : 'Done'}
          </Button>
        </ScrollView>
      </View>
    );
  }

  // --- Quiz Taking Player Screen ---
  const currentQuestion = orderedQuestions[currentQuestionIndex];
  const total = orderedQuestions.length;

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View
        className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800"
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity
            onPress={handleExit}
            className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            style={{ minHeight: 44, minWidth: 44 }}
          >
            <MaterialIcons
              name="close"
              size={20}
              color={isDark ? "#a3a3a3" : "#525252"}
            />
          </TouchableOpacity>

          <View className="flex-1 px-3">
            <Heading size="lg" numberOfLines={1}>
              {quiz.title}
            </Heading>
            <Caption className="text-neutral-500 dark:text-neutral-400">
              Question {currentQuestionIndex + 1} of {total}
            </Caption>
          </View>

          <View className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
            <BodyText className="text-indigo-600 dark:text-indigo-400 font-semibold">
              {getAnsweredCount()}/{total}
            </BodyText>
          </View>
        </View>

        {quiz.duration_minutes > 0 && (
          <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <Caption className="text-neutral-500">Time Remaining</Caption>
            <BodyText
              className={`font-mono font-bold text-lg ${
                timeRemaining < 60 ? "text-red-500" : "text-neutral-800 dark:text-neutral-200"
              }`}
            >
              {formatTimerValue(timeRemaining)}
            </BodyText>
          </View>
        )}
      </View>

      {/* Main Content */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {currentQuestion && (
          <View className="space-y-4">
            {/* Question Text */}
            <View className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
              <AutoHeightWebView
                html={currentQuestion.question_text_html || currentQuestion.question_text}
                scrollEnabled={true}
                minHeight={100}
              />
            </View>

            {/* Options */}
            <View className="space-y-3">
              {currentQuestion.options.map((opt) => {
                const isSelected = userAnswers[currentQuestionIndex] === opt.id;
                const borderColor = isSelected
                  ? "border-indigo-600 dark:border-indigo-500"
                  : "border-neutral-200 dark:border-neutral-800";
                const bgColor = isSelected
                  ? "bg-indigo-50/50 dark:bg-indigo-950/20"
                  : "bg-white dark:bg-neutral-900";

                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => selectOption(opt.id)}
                    className={`flex-row items-start border-2 rounded-2xl p-4 ${bgColor} ${borderColor}`}
                    style={{ minHeight: 56 }}
                  >
                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 mt-0.5 ${isSelected ? "border-indigo-600 bg-indigo-600" : "border-neutral-300 dark:border-neutral-700"}`}>
                      {isSelected && <View className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </View>

                    <View className="flex-1">
                      {!opt.option_text_html || !opt.option_text_html.includes("<") ? (
                        <BodyText className="text-neutral-800 dark:text-neutral-200">
                          {opt.option_text}
                        </BodyText>
                      ) : (
                        <AutoHeightWebView
                          html={opt.option_text_html}
                          scrollEnabled={false}
                          minHeight={40}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Navigation */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex-row px-4 py-3 justify-between items-center"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <TouchableOpacity
          onPress={previousQuestion}
          disabled={currentQuestionIndex === 0}
          className={`flex-row items-center px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 ${currentQuestionIndex === 0 ? "opacity-30" : ""}`}
        >
          <MaterialIcons name="arrow-back" size={20} color={isDark ? "#ffffff" : "#171717"} />
          <BodyText className="ml-1.5 font-bold">Prev</BodyText>
        </TouchableOpacity>

        {currentQuestionIndex === total - 1 ? (
          <TouchableOpacity
            onPress={submitQuizConfirm}
            disabled={resultsLoading}
            className="flex-row items-center px-6 py-3 rounded-xl bg-indigo-600"
          >
            {resultsLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <BodyText className="text-white font-bold mr-1.5">Submit</BodyText>
                <MaterialIcons name="send" size={20} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={nextQuestion}
            className="flex-row items-center px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700"
          >
            <BodyText className="mr-1.5 font-bold">Next</BodyText>
            <MaterialIcons name="arrow-forward" size={20} color={isDark ? "#ffffff" : "#171717"} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
