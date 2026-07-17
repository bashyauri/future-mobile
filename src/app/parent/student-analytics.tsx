import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import api from "@/lib/api";
import { Card } from "@/components/Card";
import { Heading, Subheading, BodyText, Caption } from "@/components/Typography";

type AnalyticsOverview = {
  total_quizzes: number;
  average_score: number | null;
  total_time_spent: number;
  study_streak: number;
};

type SubjectPerformance = {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  total_attempts: number;
  average_score: number;
  best_score: number;
  total_time_spent_seconds: number;
};

type QuizHistory = {
  id: number;
  quiz_type: string;
  subject_name: string;
  score: number;
  total_questions: number;
  completed_at: string;
};

type StudyStreak = {
  current_streak: number;
  last_activity_date: string | null;
};

export default function StudentAnalyticsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const params = useLocalSearchParams<{
    studentId: string;
    studentName: string;
  }>();

  const studentId = params.studentId;
  const studentName = params.studentName ?? "Student";

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [subjectPerf, setSubjectPerf] = useState<SubjectPerformance[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([]);
  const [streak, setStreak] = useState<StudyStreak | null>(null);

  const loadAnalytics = async () => {
    try {
      const [overviewRes, perfRes, historyRes, streakRes] = await Promise.all([
        api.get(`/parent/students/${studentId}/analytics/overview`),
        api.get(`/parent/students/${studentId}/analytics/subject-performance`),
        api.get(
          `/parent/students/${studentId}/analytics/quiz-history?limit=10`
        ),
        api.get(`/parent/students/${studentId}/analytics/study-streak`),
      ]);

      setOverview(overviewRes.data?.data ?? null);
      setSubjectPerf(perfRes.data?.data ?? []);
      setQuizHistory(historyRes.data?.data ?? []);
      setStreak(streakRes.data?.data ?? null);
    } catch (e) {
      console.warn("Failed to load student analytics", e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadAnalytics();
      setIsLoading(false);
    };
    init();
  }, [studentId]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalytics();
    setIsRefreshing(false);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (seconds: number): string => {
    const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
    const hours = Math.floor(safeSeconds / 3600);
    const mins = Math.floor((safeSeconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return isDark ? "#6ee7b7" : "#16a34a";
    if (score >= 50) return isDark ? "#fbbf24" : "#d97706";
    return isDark ? "#fca5a5" : "#dc2626";
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: studentName,
            headerStyle: {
              backgroundColor: isDark ? "#0a0a0a" : "#ffffff",
            },
            headerTintColor: isDark ? "#fafafa" : "#171717",
          }}
        />
        <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text
            className={`mt-3 text-sm ${
              isDark ? "text-neutral-400" : "text-neutral-500"
            }`}
          >
            Loading analytics...
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `${studentName}'s Progress`,
          headerStyle: {
            backgroundColor: isDark ? "#0a0a0a" : "#ffffff",
          },
          headerTintColor: isDark ? "#fafafa" : "#171717",
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        className="flex-1 bg-neutral-50 dark:bg-neutral-950 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#4f46e5"
          />
        }
      >
        {/* ─── Overview Stats ─── */}
        <View className="flex-row justify-between mb-4">
          {/* Streak */}
          <View
            className={`flex-1 mr-2 rounded-2xl p-4 items-center ${
              isDark ? "bg-neutral-900 border border-neutral-800" : "bg-white border border-neutral-100"
            }`}
          >
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mb-2"
              style={{
                backgroundColor: isDark
                  ? "rgba(249,115,22,0.15)"
                  : "#fff7ed",
              }}
            >
              <MaterialIcons
                name="local-fire-department"
                size={22}
                color="#ea580c"
              />
            </View>
            <Text
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-neutral-900"
              }`}
            >
              {streak?.current_streak ?? overview?.study_streak ?? 0}
            </Text>
            <Text
              className={`text-xs ${
                isDark ? "text-neutral-400" : "text-neutral-500"
              }`}
            >
              Day Streak
            </Text>
          </View>

          {/* Quizzes */}
          <View
            className={`flex-1 mx-1 rounded-2xl p-4 items-center ${
              isDark ? "bg-neutral-900 border border-neutral-800" : "bg-white border border-neutral-100"
            }`}
          >
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mb-2"
              style={{
                backgroundColor: isDark
                  ? "rgba(99,102,241,0.15)"
                  : "#eef2ff",
              }}
            >
              <MaterialIcons name="quiz" size={22} color="#4f46e5" />
            </View>
            <Text
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-neutral-900"
              }`}
            >
              {overview?.total_quizzes ?? 0}
            </Text>
            <Text
              className={`text-xs ${
                isDark ? "text-neutral-400" : "text-neutral-500"
              }`}
            >
              Quizzes
            </Text>
          </View>

          {/* Avg Score */}
          <View
            className={`flex-1 ml-2 rounded-2xl p-4 items-center ${
              isDark ? "bg-neutral-900 border border-neutral-800" : "bg-white border border-neutral-100"
            }`}
          >
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mb-2"
              style={{
                backgroundColor: isDark
                  ? "rgba(16,185,129,0.15)"
                  : "#d1fae5",
              }}
            >
              <MaterialIcons name="analytics" size={22} color="#10b981" />
            </View>
            <Text
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-neutral-900"
              }`}
            >
              {overview?.average_score != null
                ? Math.round(Number(overview.average_score)) + "%"
                : "N/A"}
            </Text>
            <Text
              className={`text-xs ${
                isDark ? "text-neutral-400" : "text-neutral-500"
              }`}
            >
              Avg Score
            </Text>
          </View>
        </View>

        {/* Time Spent */}
        <Card variant="bordered" className="mb-4">
          <View className="flex-row items-center">
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mr-3"
              style={{
                backgroundColor: isDark
                  ? "rgba(14,165,233,0.15)"
                  : "#e0f2fe",
              }}
            >
              <MaterialIcons name="schedule" size={20} color="#0ea5e9" />
            </View>
            <View>
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                {formatTime(overview?.total_time_spent ?? 0)}
              </Text>
              <Text
                className={`text-xs ${
                  isDark ? "text-neutral-400" : "text-neutral-500"
                }`}
              >
                Total study time
              </Text>
            </View>
          </View>
        </Card>

        {/* ─── Subject Performance ─── */}
        {subjectPerf.length > 0 && (
          <>
            <Subheading size="md" className="mt-2 mb-3 px-1">
              Subject Performance
            </Subheading>

            {subjectPerf.map((perf) => (
              <Card
                key={perf.subject_id || perf.subject_name}
                variant="bordered"
                className="mb-3"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center flex-1">
                    <View
                      className="w-9 h-9 rounded-lg items-center justify-center mr-3"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(139,92,246,0.15)"
                          : "#ede9fe",
                      }}
                    >
                      <MaterialIcons
                        name="menu-book"
                        size={18}
                        color="#8b5cf6"
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-semibold ${
                          isDark ? "text-white" : "text-neutral-900"
                        }`}
                        numberOfLines={1}
                      >
                        {perf.subject_name || "Unknown Subject"}
                      </Text>
                      {perf.subject_code ? (
                        <Text
                          className={`text-xs ${
                            isDark ? "text-neutral-400" : "text-neutral-500"
                          }`}
                        >
                          {perf.subject_code}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Text
                    className="text-xl font-bold"
                    style={{
                      color: getScoreColor(perf.average_score ?? 0),
                    }}
                  >
                    {perf.average_score != null
                      ? Math.round(Number(perf.average_score)) + "%"
                      : "N/A"}
                  </Text>
                </View>

                {/* Metrics row */}
                <View
                  className={`flex-row pt-3 border-t ${
                    isDark ? "border-neutral-800" : "border-neutral-100"
                  }`}
                >
                  <View className="flex-1 items-center">
                    <Text
                      className={`text-sm font-semibold ${
                        isDark ? "text-white" : "text-neutral-900"
                      }`}
                    >
                      {perf.total_attempts ?? 0}
                    </Text>
                    <Text
                      className={`text-xs ${
                        isDark ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      Attempts
                    </Text>
                  </View>
                  <View
                    className={`w-px ${
                      isDark ? "bg-neutral-700" : "bg-neutral-200"
                    }`}
                  />
                  <View className="flex-1 items-center">
                    <Text
                      className={`text-sm font-semibold ${
                        isDark ? "text-white" : "text-neutral-900"
                      }`}
                    >
                      {perf.best_score != null
                        ? Math.round(perf.best_score) + "%"
                        : "N/A"}
                    </Text>
                    <Text
                      className={`text-xs ${
                        isDark ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      Best Score
                    </Text>
                  </View>
                  <View
                    className={`w-px ${
                      isDark ? "bg-neutral-700" : "bg-neutral-200"
                    }`}
                  />
                  <View className="flex-1 items-center">
                    <Text
                      className={`text-sm font-semibold ${
                        isDark ? "text-white" : "text-neutral-900"
                      }`}
                    >
                      {formatTime(perf.total_time_spent_seconds ?? 0)}
                    </Text>
                    <Text
                      className={`text-xs ${
                        isDark ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      Time Spent
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* ─── Quiz History ─── */}
        {quizHistory.length > 0 && (
          <>
            <Subheading size="md" className="mt-2 mb-3 px-1">
              Recent Quiz History
            </Subheading>

            <Card variant="bordered" className="mb-4">
              {quizHistory.map((quiz, index) => (
                <View
                  key={quiz.id}
                  className={`flex-row items-center justify-between py-3 ${
                    index < quizHistory.length - 1
                      ? `border-b ${
                          isDark
                            ? "border-neutral-800"
                            : "border-neutral-100"
                        }`
                      : ""
                  }`}
                >
                  <View className="flex-1 mr-3">
                    <Text
                      className={`text-sm font-medium ${
                        isDark ? "text-white" : "text-neutral-900"
                      }`}
                      numberOfLines={1}
                    >
                      {quiz.subject_name || "Unknown Subject"}
                    </Text>
                    <Text
                      className={`text-xs mt-0.5 ${
                        isDark ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      {quiz.quiz_type || "Quiz"} •{" "}
                      {quiz.completed_at
                        ? formatDate(quiz.completed_at)
                        : "N/A"}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text
                      className="text-sm font-bold"
                      style={{
                        color: getScoreColor(quiz.score ?? 0),
                      }}
                    >
                      {quiz.score != null
                        ? Math.round(Number(quiz.score)) + "%"
                        : "N/A"}
                    </Text>
                    <Text
                      className={`text-xs ${
                        isDark ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      {quiz.total_questions || 0} questions
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Empty State */}
        {subjectPerf.length === 0 && quizHistory.length === 0 && (
          <Card variant="bordered" className="items-center py-10 mb-4">
            <MaterialIcons
              name="bar-chart"
              size={48}
              color={isDark ? "#404040" : "#d4d4d4"}
            />
            <Text
              className={`text-base font-medium mt-3 ${
                isDark ? "text-neutral-300" : "text-neutral-700"
              }`}
            >
              No activity yet
            </Text>
            <Text
              className={`text-sm mt-1 text-center px-8 ${
                isDark ? "text-neutral-500" : "text-neutral-400"
              }`}
            >
              {studentName} hasn&apos;t taken any quizzes or completed any
              lessons yet.
            </Text>
          </Card>
        )}

        <View className="h-8" />
      </ScrollView>
    </>
  );
}
