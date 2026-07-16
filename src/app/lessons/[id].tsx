import React, { useEffect, useState, useRef } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
// import { Video, ResizeMode } from "expo-av";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AutoHeightWebView } from "@/components/AutoHeightWebView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { useTheme } from "@/context/ThemeContext";
import { Heading, BodyText, Caption } from "@/components/Typography";
import { Button } from "@/components";
import api from "@/lib/api";

type Option = {
  id: number;
  option_text: string;
  option_text_html: string;
  is_correct: boolean;
};

type PracticeQuestion = {
  id: number;
  question_text: string;
  question_text_html: string;
  question_image: string | null;
  difficulty: string;
  explanation: string | null;
  explanation_html?: string | null;
  options: Option[];
};

type QuizStats = {
  total_attempts: number;
  best_score: number | null;
  can_attempt: boolean;
};

type LessonQuiz = {
  id: number;
  title: string;
  description: string;
  type: string;
  duration_minutes: number;
  question_count: number;
  user_stats: QuizStats;
};

interface Lesson {
  id: number;
  title: string;
  description: string;
  video_url: string;
  video_type: string;
  video_embed_url?: string | null;
  video_stream_url?: string | null;
  video_playback_url?: string | null;
  duration_seconds: number;
  duration_minutes: number;
  thumbnail_url: string;
  subject: {
    id: number;
    name: string;
    code: string;
    slug: string;
  };
  topic: {
    id: number;
    name: string;
  } | null;
  content: string | null;
  progress: {
    is_completed: boolean;
    progress_percentage: number;
    current_time_seconds: number;
    time_spent_seconds: number;
  } | null;
  previous_lesson: {
    id: number;
    title: string;
  } | null;
  next_lesson: {
    id: number;
    title: string;
  } | null;
  quiz: LessonQuiz | null;
  quiz_completed: boolean;
  practice_questions: PracticeQuestion[];
}

export default function LessonVideoScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Local state for practice questions
  const [selectedPracticeAnswers, setSelectedPracticeAnswers] = useState<
    Record<number, number>
  >({});
  const [showPracticeResults, setShowPracticeResults] = useState<
    Record<number, boolean>
  >({});

  const webViewRef = useRef<WebView>(null);

  const loadLesson = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!id) {
        setError("Lesson ID is required");
        return;
      }

      const response = await api.get(`/lessons/${id}`);
      const data = response.data?.data ?? response.data;
      setLesson(data);
      setIsCompleted(data.progress?.is_completed ?? false);

      // Set video URL based on video type
      setVideoUrl(
        data.video_embed_url ??
          data.video_stream_url ??
          data.video_playback_url ??
          data.video_url ??
          null,
      );
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? e?.message ?? "Failed to load lesson",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLesson();
  }, [id]);

  const markAsCompleted = async () => {
    if (!lesson) return;

    // Direct check if quiz is required but not done
    if (lesson.quiz && !lesson.quiz_completed) {
      Alert.alert(
        "Quiz Required",
        "Please complete the lesson quiz before marking this lesson as complete.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Start Quiz",
            onPress: () => router.push(`/quiz/${lesson.quiz?.id}`),
          },
        ],
      );
      return;
    }

    try {
      setIsCompleting(true);
      await api.post(`/lessons/${lesson.id}/complete`);
      setIsCompleted(true);
      Alert.alert("Success", "Lesson marked as completed successfully!");
      // Reload lesson details to sync status
      await loadLesson();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ??
          e?.message ??
          "Failed to mark as completed.",
      );
    } finally {
      setIsCompleting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleSelectPracticeOption = (questionId: number, optionId: number) => {
    if (showPracticeResults[questionId]) return;
    setSelectedPracticeAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmitPracticeAnswer = (questionId: number) => {
    setShowPracticeResults((prev) => ({
      ...prev,
      [questionId]: true,
    }));
  };

  const handleResetPracticeQuestion = (questionId: number) => {
    setSelectedPracticeAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setShowPracticeResults((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
        <BodyText className="mt-4 text-neutral-500">Loading lesson...</BodyText>
      </View>
    );
  }

  if (error || !lesson) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
        <MaterialIcons name="error-outline" size={48} color="#ef4444" />
        <BodyText className="mt-4 text-center text-neutral-700 dark:text-neutral-300">
          {error || "Lesson not found"}
        </BodyText>
        <Button
          variant="outline"
          size="md"
          onPress={() => router.back()}
          className="mt-4"
        >
          Go Back
        </Button>
      </View>
    );
  }

  const hasQuiz = !!lesson.quiz;
  const isQuizDone = lesson.quiz_completed;
  const canComplete = !hasQuiz || isQuizDone;
  const canAttemptQuiz = lesson.quiz?.user_stats.can_attempt ?? true;

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
        <View className="flex-row items-center">
          <TouchableOpacity onPress={handleBack} style={{ marginRight: 12 }}>
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={isDark ? "#f5f5f5" : "#171717"}
            />
          </TouchableOpacity>
          <View className="flex-1">
            <Heading size="lg" className="mb-1" numberOfLines={1}>
              {lesson.title}
            </Heading>
            <Caption className="text-neutral-500 dark:text-neutral-400">
              {lesson.subject.name}
            </Caption>
          </View>
          {isCompleted && (
            <MaterialIcons name="check-circle" size={24} color="#22c55e" />
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Video Player */}
        {videoUrl ? (
          <View className="bg-black aspect-video w-full">
            <WebView
              ref={webViewRef}
              source={{ uri: videoUrl }}
              style={{ flex: 1 }}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
            />
          </View>
        ) : (
          <View className="bg-neutral-900 aspect-video items-center justify-center w-full">
            <MaterialIcons
              name="play-circle-outline"
              size={64}
              color="#ffffff"
            />
            <BodyText className="text-white mt-2">No video available</BodyText>
          </View>
        )}

        {/* Lesson Info Card */}
        <View className="p-4 space-y-4">
          <View className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1">
                <Heading size="lg" className="mb-2">
                  {lesson.title}
                </Heading>
                <View className="flex flex-row flex-wrap items-center gap-2">
                  {lesson.topic && (
                    <View className="bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900">
                      <Caption className="text-xs text-blue-600 dark:text-blue-400">
                        {lesson.topic.name}
                      </Caption>
                    </View>
                  )}
                  {lesson.duration_minutes && (
                    <View className="flex-row items-center">
                      <MaterialIcons
                        name="schedule"
                        size={14}
                        color="#9ca3af"
                      />
                      <Caption className="text-neutral-500 dark:text-neutral-400 ml-1">
                        {lesson.duration_minutes} min
                      </Caption>
                    </View>
                  )}
                </View>
              </View>

              {isCompleted && (
                <View className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-1 rounded-full">
                  <Caption className="text-green-600 dark:text-green-400 font-bold">
                    Completed
                  </Caption>
                </View>
              )}
            </View>

            {/* Progress Bar */}
            {lesson.progress &&
              !isCompleted &&
              lesson.progress.progress_percentage > 0 && (
                <View className="mb-4 mt-2">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Caption className="text-neutral-500 dark:text-neutral-400">
                      Your Progress
                    </Caption>
                    <Caption className="text-blue-600 dark:text-blue-400 font-semibold">
                      {Math.floor(lesson.progress.progress_percentage)}%
                    </Caption>
                  </View>
                  <View className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-blue-600 dark:bg-blue-500"
                      style={{
                        width: `${lesson.progress.progress_percentage}%`,
                      }}
                    />
                  </View>
                </View>
              )}

            {lesson.description && (
              <BodyText className="text-neutral-600 dark:text-neutral-400 mt-2 mb-4 leading-relaxed">
                {lesson.description}
              </BodyText>
            )}

            {/* Mark as Complete Button */}
            {!isCompleted && (
              <View className="mt-2">
                {hasQuiz && !isQuizDone && (
                  <View className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl flex-row items-start">
                    <MaterialIcons
                      name="warning"
                      size={18}
                      color="#eab308"
                      className="mt-0.5 mr-2"
                    />
                    <View className="flex-1">
                      <Caption className="text-amber-800 dark:text-amber-300 font-medium">
                        Complete the lesson quiz below to unlock completion.
                      </Caption>
                    </View>
                  </View>
                )}

                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onPress={markAsCompleted}
                  disabled={!canComplete || isCompleting}
                  style={{ minHeight: 44 }}
                >
                  {isCompleting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : !canComplete ? (
                    "Complete Quiz to Unlock"
                  ) : (
                    "Mark as Complete"
                  )}
                </Button>
              </View>
            )}
          </View>

          {/* Lesson Quiz Card */}
          {hasQuiz && lesson.quiz && (
            <View className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
              <View className="flex-row justify-between items-center mb-4">
                <Heading size="md">Lesson Quiz</Heading>
                <View
                  className={`px-2.5 py-0.5 rounded-full ${isQuizDone ? "bg-green-100 dark:bg-green-950/30" : "bg-blue-100 dark:bg-blue-950/30"}`}
                >
                  <Caption
                    className={
                      isQuizDone
                        ? "text-green-600 font-bold"
                        : "text-blue-600 font-bold"
                    }
                  >
                    {isQuizDone ? "COMPLETED" : "REQUIRED"}
                  </Caption>
                </View>
              </View>

              <BodyText className="text-neutral-800 dark:text-neutral-200 font-bold mb-1">
                {lesson.quiz.title}
              </BodyText>
              <Caption className="text-neutral-500 mb-4">
                {lesson.quiz.description || "Linked to this lesson"}
              </Caption>

              <View className="grid grid-cols-2 gap-3 mb-4 flex-row flex-wrap">
                <View className="flex-1 min-w-[45%] bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <Caption className="text-neutral-400">Questions</Caption>
                  <BodyText className="font-bold">
                    {lesson.quiz.question_count}
                  </BodyText>
                </View>
                <View className="flex-1 min-w-[45%] bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <Caption className="text-neutral-400">Duration</Caption>
                  <BodyText className="font-bold">
                    {lesson.quiz.duration_minutes} mins
                  </BodyText>
                </View>
                <View className="flex-1 min-w-[45%] bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <Caption className="text-neutral-400">Attempts Taken</Caption>
                  <BodyText className="font-bold">
                    {lesson.quiz.user_stats.total_attempts}
                  </BodyText>
                </View>
                <View className="flex-1 min-w-[45%] bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <Caption className="text-neutral-400">Best Score</Caption>
                  <BodyText className="font-bold">
                    {lesson.quiz.user_stats.best_score !== null
                      ? `${Math.round(lesson.quiz.user_stats.best_score)}%`
                      : "No score"}
                  </BodyText>
                </View>
              </View>

              <Button
                variant="primary"
                size="md"
                fullWidth
                onPress={() => router.push(`/quiz/${lesson.quiz?.id}`)}
                disabled={!canAttemptQuiz}
                style={{ minHeight: 44 }}
              >
                {lesson.quiz.user_stats.total_attempts > 0
                  ? "Retake Quiz"
                  : "Start Quiz"}
              </Button>
            </View>
          )}

          {/* Inline Practice Questions Section */}
          {lesson.practice_questions &&
            lesson.practice_questions.length > 0 && (
              <View className="space-y-4 mt-2">
                <View className="flex-row justify-between items-center px-1">
                  <Heading size="md">Practice Questions</Heading>
                  <View className="bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900">
                    <Caption className="text-blue-600 dark:text-blue-400 font-bold">
                      {lesson.practice_questions.length} Questions
                    </Caption>
                  </View>
                </View>

                <Caption className="text-neutral-500 px-1">
                  Test your understanding with these practice questions. Select
                  an answer and check immediately.
                </Caption>

                {lesson.practice_questions.map((q, idx) => {
                  const selectedOptId = selectedPracticeAnswers[q.id];
                  const isChecked = showPracticeResults[q.id];
                  const selectedOption = q.options.find(
                    (o) => o.id === selectedOptId,
                  );
                  const isSelectedCorrect = selectedOption?.is_correct ?? false;

                  let questionBg = "bg-white dark:bg-neutral-900";
                  let questionBorder =
                    "border-neutral-200 dark:border-neutral-800";

                  if (isChecked) {
                    if (isSelectedCorrect) {
                      questionBg = "bg-green-50/30 dark:bg-green-950/10";
                      questionBorder = "border-green-200 dark:border-green-900";
                    } else {
                      questionBg = "bg-red-50/30 dark:bg-red-950/10";
                      questionBorder = "border-red-200 dark:border-red-900";
                    }
                  }

                  return (
                    <View
                      key={q.id}
                      className={`rounded-2xl border p-4 ${questionBg} ${questionBorder} space-y-4`}
                    >
                      {/* Header */}
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View
                            className={`w-7 h-7 rounded-full flex items-center justify-center ${isChecked ? (isSelectedCorrect ? "bg-green-600" : "bg-red-600") : "bg-indigo-600"}`}
                          >
                            {isChecked ? (
                              <MaterialIcons
                                name={isSelectedCorrect ? "check" : "close"}
                                size={16}
                                color="#ffffff"
                              />
                            ) : (
                              <Caption className="text-white font-bold text-xs">
                                {idx + 1}
                              </Caption>
                            )}
                          </View>
                          <Caption className="text-neutral-400 font-bold">
                            Practice Question
                          </Caption>
                        </View>

                        {q.difficulty && (
                          <View
                            className={`px-2.5 py-0.5 rounded border ${
                              q.difficulty === "easy"
                                ? "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900"
                                : q.difficulty === "medium"
                                  ? "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900"
                                  : "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900"
                            }`}
                          >
                            <Caption
                              className={
                                q.difficulty === "easy"
                                  ? "text-green-600 font-bold text-xs"
                                  : q.difficulty === "medium"
                                    ? "text-amber-600 font-bold text-xs"
                                    : "text-red-600 font-bold text-xs"
                              }
                            >
                              {q.difficulty.toUpperCase()}
                            </Caption>
                          </View>
                        )}
                      </View>

                      {/* Question Text HTML */}
                      <AutoHeightWebView
                        html={q.question_text_html || q.question_text}
                        scrollEnabled={false}
                        minHeight={60}
                      />

                      {/* Options list */}
                      <View className="space-y-2">
                        {q.options.map((opt) => {
                          const isSelected = selectedOptId === opt.id;
                          const isCorrectOpt = opt.is_correct;

                          let optionBg = "bg-transparent";
                          let optionBorder =
                            "border-neutral-200 dark:border-neutral-800";
                          let textClass =
                            "text-neutral-700 dark:text-neutral-300";

                          if (isChecked) {
                            if (isCorrectOpt) {
                              optionBg = "bg-green-100 dark:bg-green-950/30";
                              optionBorder = "border-green-500";
                              textClass =
                                "text-green-700 dark:text-green-400 font-medium";
                            } else if (isSelected && !isCorrectOpt) {
                              optionBg = "bg-red-100 dark:bg-red-950/30";
                              optionBorder = "border-red-500";
                              textClass =
                                "text-red-700 dark:text-red-400 font-medium";
                            } else {
                              optionBg =
                                "bg-neutral-50 dark:bg-neutral-800/40 opacity-40";
                            }
                          } else if (isSelected) {
                            optionBg = "bg-indigo-50 dark:bg-indigo-950/20";
                            optionBorder = "border-indigo-500 border-2";
                          }

                          return (
                            <TouchableOpacity
                              key={opt.id}
                              onPress={() =>
                                handleSelectPracticeOption(q.id, opt.id)
                              }
                              disabled={isChecked}
                              className={`flex-row items-center border rounded-xl p-3 ${optionBg} ${optionBorder}`}
                            >
                              <View
                                className={`w-5 h-5 rounded-full border items-center justify-center mr-2.5 ${isSelected ? "border-indigo-600 bg-indigo-600" : "border-neutral-300 dark:border-neutral-700"}`}
                              >
                                {isSelected && (
                                  <View className="w-2 h-2 bg-white rounded-full" />
                                )}
                              </View>

                              <View className="flex-1">
                                {!opt.option_text_html ||
                                !opt.option_text_html.includes("<") ? (
                                  <BodyText className={textClass}>
                                    {opt.option_text}
                                  </BodyText>
                                ) : (
                                  <AutoHeightWebView
                                    html={opt.option_text_html}
                                    scrollEnabled={false}
                                    minHeight={32}
                                  />
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Explanation */}
                      {isChecked && (q.explanation_html || q.explanation) && (
                        <View className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl">
                          <Caption className="font-bold text-blue-900 dark:text-blue-300 mb-1">
                            Explanation
                          </Caption>

                          {q.explanation_html ? (
                            <AutoHeightWebView
                              html={q.explanation_html}
                              scrollEnabled={false}
                              minHeight={60}
                            />
                          ) : (
                            <BodyText className="text-blue-800 dark:text-blue-200 text-sm">
                              {q.explanation}
                            </BodyText>
                          )}
                        </View>
                      )}

                      {/* Buttons */}
                      <View className="flex-row gap-2 pt-1">
                        {!isChecked ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onPress={() => handleSubmitPracticeAnswer(q.id)}
                            disabled={selectedOptId === undefined}
                            style={{ minHeight: 36, flex: 1 }}
                          >
                            Check Answer
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onPress={() => handleResetPracticeQuestion(q.id)}
                            style={{ minHeight: 36, flex: 1 }}
                          >
                            Try Again
                          </Button>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

          {/* Lesson Content Notes */}
          {lesson.content && (
            <View className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
              <Heading size="md" className="mb-2">
                Lesson Notes
              </Heading>
              <Caption className="text-neutral-500 mb-4">
                Detailed notes and additional reading material for this lesson.
              </Caption>
              <WebView
                source={{
                  html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
                      <style>
                        body {
                          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                          font-size: 15px;
                          line-height: 1.6;
                          color: ${isDark ? "#fafafa" : "#171717"};
                          background-color: transparent;
                          margin: 0;
                          padding: 0;
                        }
                        a { color: #4f46e5; text-decoration: none; }
                        pre { background-color: ${isDark ? "#27272a" : "#f4f4f5"}; padding: 12px; border-radius: 8px; overflow-x: auto; }
                        img { max-width: 100%; height: auto; border-radius: 8px; }
                      </style>
                    </head>
                    <body>
                      ${lesson.content}
                    </body>
                  </html>
                `,
                }}
                style={{ height: 260, backgroundColor: "transparent" }}
                scrollEnabled={true}
              />
            </View>
          )}

          {/* Previous / Next Lesson Navigation Buttons */}
          <View className="flex-row gap-3 pt-3">
            {lesson.previous_lesson ? (
              <TouchableOpacity
                onPress={() =>
                  router.push(`/lessons/${lesson.previous_lesson?.id}`)
                }
                className="flex-1 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4"
                style={{ minHeight: 48 }}
              >
                <View className="flex-row items-center justify-center">
                  <MaterialIcons name="arrow-back" size={20} color="#4f46e5" />
                  <BodyText className="ml-2 font-bold text-blue-600 dark:text-blue-400">
                    Previous
                  </BodyText>
                </View>
              </TouchableOpacity>
            ) : (
              <View className="flex-1" />
            )}

            {lesson.next_lesson ? (
              <TouchableOpacity
                onPress={() =>
                  router.push(`/lessons/${lesson.next_lesson?.id}`)
                }
                className="flex-1 bg-indigo-600 rounded-2xl p-4"
                style={{ minHeight: 48 }}
              >
                <View className="flex-row items-center justify-center">
                  <BodyText className="text-white font-bold">
                    Next Lesson
                  </BodyText>
                  <MaterialIcons
                    name="arrow-forward"
                    size={20}
                    color="#ffffff"
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() =>
                  router.push(`/lessons?subjectId=${lesson.subject.id}`)
                }
                className="flex-1 bg-indigo-600 rounded-2xl p-4"
                style={{ minHeight: 48 }}
              >
                <View className="flex-row items-center justify-center">
                  <BodyText className="text-white font-bold">
                    Back to Subject
                  </BodyText>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
