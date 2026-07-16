import React, { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";
import api from "@/lib/api";
import { Card } from "@/components";
import {
  BodyText,
  Caption,
  Heading,
  Subheading,
} from "@/components/Typography";
import { CardSkeleton, ListSkeleton } from "@/components/Skeleton";

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

type Subject = {
  id: number;
  name: string;
  code?: string;
};

export default function HomeScreen() {
  const router = useRouter();

  const netInfo = useNetInfo();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async (): Promise<void> => {
    try {
      const [subjectsRes, analyticsRes, subjectPerfRes, historyRes] = await Promise.all([
        api.get("/subjects"),
        api.get("/analytics/overview"),
        api.get("/analytics/subject-performance"),
        api.get("/analytics/quiz-history?limit=5"),
      ]);

      setSubjects(subjectsRes.data?.data ?? subjectsRes.data ?? []);
      setAnalytics(analyticsRes.data?.data ?? null);
      setSubjectPerformance(subjectPerfRes.data?.data ?? []);
      setQuizHistory(historyRes.data?.data ?? []);
    } catch (e) {
      console.warn("Failed to load dashboard data", e);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      setIsLoading(true);
      await loadDashboard();
      setIsLoading(false);
    };
    initDashboard().catch((error) => {
      console.warn("Failed to load home dashboard", error);
      setIsLoading(false);
    });
  }, []);

  // Auto-refresh when connection is restored
  useEffect(() => {
    if (netInfo.isConnected === true) {
      loadDashboard().catch((error) => {
        console.warn("Failed to refresh after reconnection", error);
      });
    }
  }, [netInfo.isConnected]);

  const onRefresh = async (): Promise<void> => {
    setIsRefreshing(true);

    try {
      await loadDashboard();
    } catch (error) {
      console.warn("Failed to refresh home dashboard", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (seconds: number): string => {
    const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
    const hours = Math.floor(safeSeconds / 3600);
    const remainingMinutes = Math.floor((safeSeconds % 3600) / 60);

    if (hours === 0) {
      return `${remainingMinutes}m`;
    }

    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <View className="pt-16 pb-6 px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <Heading size="xl" className="mb-2">
          Student Dashboard
        </Heading>
        <BodyText className="text-neutral-500 dark:text-neutral-400">
          Quick access to practice, JAMB, and mock exams.
        </BodyText>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#4f46e5"
          />
        }
      >
        {isLoading ? (
          <>
            <View className="flex-row flex-wrap justify-between">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </View>
            <View className="flex-row justify-between mb-4">
              <Card variant="bordered" className="w-[31%] bg-white dark:bg-neutral-900 items-center py-4">
                <View className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 mb-2" />
                <View className="w-8 h-8 bg-neutral-200 dark:bg-neutral-800 rounded" />
              </Card>
              <Card variant="bordered" className="w-[31%] bg-white dark:bg-neutral-900 items-center py-4">
                <View className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 mb-2" />
                <View className="w-8 h-8 bg-neutral-200 dark:bg-neutral-800 rounded" />
              </Card>
              <Card variant="bordered" className="w-[31%] bg-white dark:bg-neutral-900 items-center py-4">
                <View className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 mb-2" />
                <View className="w-8 h-8 bg-neutral-200 dark:bg-neutral-800 rounded" />
              </Card>
            </View>
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            {netInfo.isConnected === false && (
              <View className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4 flex-row items-center">
                <MaterialIcons name="wifi-off" size={20} color="#dc2626" />
                <BodyText className="ml-2 text-red-600 dark:text-red-400">
                  You are offline. Please check your connection.
                </BodyText>
              </View>
            )}

            <Subheading size="md" className="mb-3 px-1">
              Quick Access
            </Subheading>

            <View className="flex-row flex-wrap justify-between">
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/practice-setup")}
                activeOpacity={0.8}
                className="w-[48%] mb-4"
              >
                <Card variant="bordered" className="bg-white dark:bg-neutral-900">
                  <View className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-900/30 items-center justify-center mb-3">
                    <MaterialIcons name="menu-book" size={22} color="#ea580c" />
                  </View>
                  <Subheading size="md">Practice</Subheading>
                  <Caption className="mt-1 text-neutral-500 dark:text-neutral-400">
                    Set up a focused subject practice session
                  </Caption>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/(tabs)/jamb-setup")}
                activeOpacity={0.8}
                className="w-[48%] mb-4"
              >
                <Card variant="bordered" className="bg-white dark:bg-neutral-900">
                  <View className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 items-center justify-center mb-3">
                    <MaterialIcons name="auto-stories" size={22} color="#2563eb" />
                  </View>
                  <Subheading size="md">JAMB</Subheading>
                  <Caption className="mt-1 text-neutral-500 dark:text-neutral-400">
                    Start the standard 4-subject JAMB flow
                  </Caption>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/(tabs)/mock-setup")}
                activeOpacity={0.8}
                className="w-[48%] mb-4"
              >
                <Card variant="bordered" className="bg-white dark:bg-neutral-900">
                  <View className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/30 items-center justify-center mb-3">
                    <MaterialIcons name="timer" size={22} color="#7c3aed" />
                  </View>
                  <Subheading size="md">Mock Exam</Subheading>
                  <Caption className="mt-1 text-neutral-500 dark:text-neutral-400">
                    Create a timed mock exam session
                  </Caption>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/lessons")}
                activeOpacity={0.8}
                className="w-[48%] mb-4"
              >
                <Card variant="bordered" className="bg-white dark:bg-neutral-900">
                  <View className="w-11 h-11 rounded-xl bg-green-100 dark:bg-green-900/30 items-center justify-center mb-3">
                    <MaterialIcons name="play-circle" size={22} color="#16a34a" />
                  </View>
                  <Subheading size="md">Lessons</Subheading>
                  <Caption className="mt-1 text-neutral-500 dark:text-neutral-400">
                    Watch video lessons
                  </Caption>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/(tabs)/settings")}
                activeOpacity={0.8}
                className="w-[48%] mb-4"
              >
                <Card variant="bordered" className="bg-white dark:bg-neutral-900">
                  <View className="w-11 h-11 rounded-xl bg-neutral-200 dark:bg-neutral-800 items-center justify-center mb-3">
                    <MaterialIcons name="settings" size={22} color="#52525b" />
                  </View>
                  <Subheading size="md">Settings</Subheading>
                  <Caption className="mt-1 text-neutral-500 dark:text-neutral-400">
                    Theme, account, and app preferences
                  </Caption>
                </Card>
              </TouchableOpacity>
            </View>

            <Subheading size="md" className="mt-2 mb-3 px-1">
              Your Progress
            </Subheading>

            <View className="flex-row justify-between mb-4">
              <Card
                variant="bordered"
                className="w-[31%] bg-white dark:bg-neutral-900 items-center py-4"
              >
                <MaterialIcons
                  name="local-fire-department"
                  size={24}
                  color="#ea580c"
                />
                <Heading
                  size="lg"
                  className="mt-2 text-neutral-900 dark:text-white"
                >
                  {analytics?.study_streak ?? 0}
                </Heading>
                <Caption className="text-neutral-500 text-center">
                  Day Streak
                </Caption>
              </Card>

              <Card
                variant="bordered"
                className="w-[31%] bg-white dark:bg-neutral-900 items-center py-4"
              >
                <MaterialIcons name="quiz" size={24} color="#4f46e5" />
                <Heading
                  size="lg"
                  className="mt-2 text-neutral-900 dark:text-white"
                >
                  {analytics?.total_quizzes ?? 0}
                </Heading>
                <Caption className="text-neutral-500 text-center">Quizzes</Caption>
              </Card>

              <Card
                variant="bordered"
                className="w-[31%] bg-white dark:bg-neutral-900 items-center py-4"
              >
                <MaterialIcons name="analytics" size={24} color="#10b981" />
                <Heading
                  size="lg"
                  className="mt-2 text-neutral-900 dark:text-white"
                >
                  {analytics?.average_score != null
                    ? Math.round(Number(analytics.average_score)) + "%"
                    : "N/A"}
                </Heading>
                <Caption className="text-neutral-500 text-center">
                  Avg. Score
                </Caption>
              </Card>
            </View>

            <Card variant="bordered" className="mt-2 bg-white dark:bg-neutral-900">
              <View className="flex-row items-center justify-between mb-3">
                <Subheading size="md">My Subjects</Subheading>
                <Caption className="text-neutral-500 dark:text-neutral-400">
                  {subjects.length}
                </Caption>
              </View>

              {subjects.length === 0 ? (
                <BodyText variant="subtle">No enrolled subjects yet.</BodyText>
              ) : (
                <View className="gap-2">
                  {subjects.map((subject) => (
                    <View
                      key={subject.id}
                      className="flex-row items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800"
                    >
                      <BodyText>{subject.name}</BodyText>
                      {subject.code ? (
                        <Caption className="text-neutral-500 dark:text-neutral-400">
                          {subject.code}
                        </Caption>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </Card>

            {/* Subject Performance */}
            {subjectPerformance && subjectPerformance.length > 0 && (
              <Card variant="bordered" className="mt-4 bg-white dark:bg-neutral-900">
                <View className="flex-row items-center justify-between mb-3">
                  <Subheading size="md">Subject Performance</Subheading>
                  <Caption className="text-neutral-500 dark:text-neutral-400">
                    Top subjects
                  </Caption>
                </View>

                <View className="gap-3">
                  {subjectPerformance.slice(0, 3).map((perf) => (
                    <View
                      key={perf.subject_id || perf.subject_name}
                      className="border-b border-neutral-100 dark:border-neutral-800 pb-3 last:border-0 last:pb-0"
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <BodyText className="font-semibold">{perf.subject_name || 'Unknown Subject'}</BodyText>
                        <Caption className="text-primary-600 dark:text-primary-400">
                          {perf.average_score != null ? Math.round(Number(perf.average_score)) + '%' : 'N/A'}
                        </Caption>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <Caption className="text-neutral-500 dark:text-neutral-400">
                          {perf.total_attempts || 0} attempts • {formatTime(perf.total_time_spent_seconds ?? 0)}
                        </Caption>
                        <Caption className="text-green-600 dark:text-green-400">
                          Best: {perf.best_score ? Math.round(perf.best_score) + '%' : 'N/A'}
                        </Caption>
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* Recent Quiz History */}
            {quizHistory && quizHistory.length > 0 && (
              <Card variant="bordered" className="mt-4 bg-white dark:bg-neutral-900">
                <View className="flex-row items-center justify-between mb-3">
                  <Subheading size="md">Recent Activity</Subheading>
                  <Caption className="text-neutral-500 dark:text-neutral-400">
                    Last 5 quizzes
                  </Caption>
                </View>

                <View className="gap-2">
                  {quizHistory.map((quiz) => (
                    <View
                      key={quiz.id}
                      className="flex-row items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                    >
                      <View className="flex-1">
                        <BodyText className="text-sm">{quiz.subject_name || 'Unknown Subject'}</BodyText>
                        <Caption className="text-neutral-500 dark:text-neutral-400">
                          {quiz.quiz_type || 'Quiz'} • {quiz.completed_at ? formatDate(quiz.completed_at) : 'N/A'}
                        </Caption>
                      </View>
                      <View className="items-end">
                        <Caption
                          className={
                            quiz.score >= 70
                              ? "text-green-600 dark:text-green-400"
                              : quiz.score >= 50
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {quiz.score != null ? Math.round(Number(quiz.score)) + '%' : 'N/A'}
                        </Caption>
                        <Caption className="text-neutral-500 dark:text-neutral-400">
                          {quiz.total_questions || 0} questions
                        </Caption>
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            )}
          </>
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}



