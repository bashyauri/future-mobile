import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import api from "@/lib/api";
import { Card } from "@/components";
import {
  BodyText,
  Caption,
  Heading,
  Subheading,
} from "@/components/Typography";
import { useTheme } from "@/context/ThemeContext";

// ─── Types ───────────────────────────────────────────────────────────────────

type AnalyticsOverview = {
  total_quizzes: number;
  average_score: number | null;
  total_time_spent: number;
  study_streak: number;
  mock_exams_taken?: number;
  best_mock_score?: number;
  videos_watched?: number;
  total_videos?: number;
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
  longest_streak: number;
  last_activity_date: string | null;
  active_days: string[];
};

type FocusKey =
  | "streak"
  | "videos"
  | "quizzes"
  | "mock_exams"
  | "avg_score"
  | "study_time"
  | null;

// ─── Mini bar chart (pure RN) ─────────────────────────────────────────────────

function BarChart({
  data,
  color,
  height = 80,
  labelKey,
  valueKey,
  suffix = "",
}: {
  data: Record<string, unknown>[];
  color: string;
  height?: number;
  labelKey: string;
  valueKey: string;
  suffix?: string;
}) {
  const values = data.map((d) => Number(d[valueKey] ?? 0));
  const max = Math.max(...values, 1);

  return (
    <View className="flex-row items-end gap-1" style={{ height }}>
      {data.map((item, i) => {
        const val = values[i];
        const barH = Math.max(2, (val / max) * height);
        return (
          <View key={i} className="flex-1 items-center gap-1">
            <Caption className="text-neutral-400 text-center" numberOfLines={1}>
              {val > 0 ? `${Math.round(val)}${suffix}` : ""}
            </Caption>
            <View
              className="w-full rounded-t-sm"
              style={{ height: barH, backgroundColor: color, opacity: 0.85 }}
            />
            <Caption
              className="text-neutral-500 text-center"
              style={{ fontSize: 9 }}
              numberOfLines={1}
            >
              {String(item[labelKey] ?? "")}
            </Caption>
          </View>
        );
      })}
    </View>
  );
}

// ─── Horizontal progress bar ──────────────────────────────────────────────────

function ScoreBar({
  score,
  color,
}: {
  score: number;
  color: string;
}) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <View className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
      <View
        className="h-full rounded-full"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </View>
  );
}

// ─── Streak calendar dots ─────────────────────────────────────────────────────

function StreakCalendar({ activeDays }: { activeDays: string[] }) {
  const activeSet = new Set(activeDays);
  const today = new Date();
  const days: { label: string; date: string; active: boolean }[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { weekday: "narrow" });
    days.push({ label, date: iso, active: activeSet.has(iso) });
  }

  // Show last 30 days in a 6-row × 5-col grid (or just a horizontal scroll)
  return (
    <View className="flex-row flex-wrap gap-1">
      {days.map((d) => (
        <View
          key={d.date}
          className="rounded-sm"
          style={{
            width: 18,
            height: 18,
            backgroundColor: d.active ? "#4f46e5" : undefined,
            borderWidth: d.active ? 0 : 1,
            borderColor: "#d4d4d8",
            opacity: d.active ? 1 : 0.4,
          }}
        />
      ))}
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  subtitle,
  color,
  highlighted,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  color: string;
  highlighted?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center mb-4 p-3 rounded-xl ${highlighted ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: color + "20" }}
      >
        <MaterialIcons name={icon as any} size={20} color={color} />
      </View>
      <View className="flex-1">
        <Subheading size="md">{title}</Subheading>
        {subtitle ? (
          <Caption className="text-neutral-500 dark:text-neutral-400">
            {subtitle}
          </Caption>
        ) : null}
      </View>
    </View>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View className="items-center px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800">
      <Heading size="lg" style={{ color }}>
        {value}
      </Heading>
      <Caption className="text-neutral-500 mt-0.5">{label}</Caption>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { focus } = useLocalSearchParams<{ focus?: FocusKey }>();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const scrollRef = useRef<ScrollView>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [subjectPerf, setSubjectPerf] = useState<SubjectPerformance[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([]);
  const [streak, setStreak] = useState<StudyStreak | null>(null);

  // Section refs for auto-scroll
  const sectionOffsets = useRef<Record<string, number>>({});

  const loadData = useCallback(async (): Promise<void> => {
    try {
      const [overviewRes, perfRes, historyRes, streakRes] = await Promise.all([
        api.get("/analytics/overview"),
        api.get("/analytics/subject-performance"),
        api.get("/analytics/quiz-history?limit=30"),
        api.get("/analytics/study-streak"),
      ]);

      setOverview(overviewRes.data?.data ?? null);
      setSubjectPerf(perfRes.data?.data ?? []);
      setQuizHistory(historyRes.data?.data ?? []);
      setStreak(streakRes.data?.data ?? null);
    } catch (e) {
      console.warn("Failed to load progress data", e);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadData().finally(() => setIsLoading(false));
  }, [loadData]);

  // Auto-scroll to focused section after layout
  useEffect(() => {
    if (!focus || isLoading) {
      return;
    }

    const focusToSection: Record<string, string> = {
      streak: "streak",
      videos: "overview",
      quizzes: "scores",
      mock_exams: "overview",
      avg_score: "scores",
      study_time: "streak",
    };

    const target = focusToSection[focus as string] ?? null;

    if (target && sectionOffsets.current[target] !== undefined) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: sectionOffsets.current[target],
          animated: true,
        });
      }, 300);
    }
  }, [focus, isLoading]);

  const onRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    await loadData().catch(() => undefined);
    setIsRefreshing(false);
  };

  const formatTime = (seconds: number): string => {
    const s = Number.isFinite(seconds) ? seconds : 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatDate = (d: string): string =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const scoreColor = (score: number): string =>
    score >= 70 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";

  // Build quiz score chart data (last 14 entries grouped by date)
  const scoreChartData = (() => {
    const byDate: Record<string, number[]> = {};
    [...quizHistory].reverse().forEach((q) => {
      if (!q.completed_at) {
        return;
      }

      const d = q.completed_at.slice(0, 10);
      if (!byDate[d]) {
        byDate[d] = [];
      }

      byDate[d].push(Number(q.score ?? 0));
    });

    return Object.entries(byDate)
      .slice(-10)
      .map(([date, scores]) => ({
        label: new Date(date).toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
        }),
        value: scores.reduce((a, b) => a + b, 0) / scores.length,
      }));
  })();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Stack.Screen options={{ title: "My Progress" }} />
        <ActivityIndicator size="large" color="#4f46e5" />
        <Caption className="mt-3 text-neutral-500">Loading analytics…</Caption>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <Stack.Screen options={{ title: "My Progress" }} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#4f46e5"
          />
        }
      >
        {/* ── Overview cards ── */}
        <View
          onLayout={(e) => {
            sectionOffsets.current["overview"] = e.nativeEvent.layout.y;
          }}
        >
          <View className="flex-row flex-wrap gap-2 mb-4">
            <StatPill
              label="Day Streak"
              value={`${overview?.study_streak ?? 0}`}
              color="#ea580c"
            />
            <StatPill
              label="Quizzes"
              value={`${overview?.total_quizzes ?? 0}`}
              color="#4f46e5"
            />
            <StatPill
              label="Mock Exams"
              value={`${overview?.mock_exams_taken ?? 0}`}
              color="#7c3aed"
            />
            <StatPill
              label="Avg. Score"
              value={
                overview?.average_score != null
                  ? `${Math.round(Number(overview.average_score))}%`
                  : "N/A"
              }
              color="#10b981"
            />
            <StatPill
              label="Videos"
              value={`${overview?.videos_watched ?? 0}`}
              color="#16a34a"
            />
            <StatPill
              label="Study Time"
              value={formatTime(overview?.total_time_spent ?? 0)}
              color="#0284c7"
            />
          </View>
        </View>

        {/* ── Quiz Scores Over Time ── */}
        <Card
          variant="bordered"
          className="mb-4 bg-white dark:bg-neutral-900"
          onLayout={(e: any) => {
            sectionOffsets.current["scores"] = e.nativeEvent.layout.y;
          }}
        >
          <SectionHeader
            icon="show-chart"
            title="Quiz Scores Over Time"
            subtitle="Average score per day"
            color="#4f46e5"
            highlighted={focus === "quizzes" || focus === "avg_score"}
          />

          {scoreChartData.length > 0 ? (
            <BarChart
              data={scoreChartData}
              color="#4f46e5"
              height={100}
              labelKey="label"
              valueKey="value"
              suffix="%"
            />
          ) : (
            <View className="items-center py-6">
              <MaterialIcons name="bar-chart" size={36} color="#a1a1aa" />
              <Caption className="text-neutral-400 mt-2">
                No quiz data yet
              </Caption>
            </View>
          )}
        </Card>

        {/* ── Subject Performance ── */}
        <Card
          variant="bordered"
          className="mb-4 bg-white dark:bg-neutral-900"
        >
          <SectionHeader
            icon="school"
            title="Subject Performance"
            subtitle="Average score per subject"
            color="#10b981"
          />

          {subjectPerf.length > 0 ? (
            <View className="gap-4">
              {subjectPerf.map((perf) => (
                <View key={perf.subject_id ?? perf.subject_name}>
                  <View className="flex-row items-center justify-between mb-1">
                    <BodyText className="font-semibold flex-1 mr-2" numberOfLines={1}>
                      {perf.subject_name ?? "Unknown"}
                    </BodyText>
                    <Caption
                      style={{
                        color: scoreColor(Number(perf.average_score ?? 0)),
                        fontWeight: "700",
                      }}
                    >
                      {perf.average_score != null
                        ? `${Math.round(Number(perf.average_score))}%`
                        : "N/A"}
                    </Caption>
                  </View>
                  <ScoreBar
                    score={Number(perf.average_score ?? 0)}
                    color={scoreColor(Number(perf.average_score ?? 0))}
                  />
                  <View className="flex-row justify-between mt-1">
                    <Caption className="text-neutral-500">
                      {perf.total_attempts} attempt
                      {perf.total_attempts !== 1 ? "s" : ""}
                    </Caption>
                    <Caption className="text-green-600 dark:text-green-400">
                      Best:{" "}
                      {perf.best_score
                        ? `${Math.round(perf.best_score)}%`
                        : "N/A"}
                    </Caption>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="items-center py-6">
              <MaterialIcons name="school" size={36} color="#a1a1aa" />
              <Caption className="text-neutral-400 mt-2">
                No subject data yet
              </Caption>
            </View>
          )}
        </Card>

        {/* ── Study Streak ── */}
        <Card
          variant="bordered"
          className="mb-4 bg-white dark:bg-neutral-900"
          onLayout={(e: any) => {
            sectionOffsets.current["streak"] = e.nativeEvent.layout.y;
          }}
        >
          <SectionHeader
            icon="local-fire-department"
            title="Study Streak"
            subtitle="Last 30 days activity"
            color="#ea580c"
            highlighted={focus === "streak" || focus === "study_time"}
          />

          <View className="flex-row justify-around mb-4">
            <View className="items-center">
              <Heading size="xl" className="text-orange-500">
                {streak?.current_streak ?? overview?.study_streak ?? 0}
              </Heading>
              <Caption className="text-neutral-500">Current</Caption>
            </View>
            <View className="w-px bg-neutral-200 dark:bg-neutral-700" />
            <View className="items-center">
              <Heading size="xl" className="text-neutral-700 dark:text-neutral-300">
                {streak?.longest_streak ?? 0}
              </Heading>
              <Caption className="text-neutral-500">Longest</Caption>
            </View>
          </View>

          <StreakCalendar activeDays={streak?.active_days ?? []} />

          <View className="flex-row items-center mt-3 gap-2">
            <View className="w-3 h-3 rounded-sm bg-indigo-600" />
            <Caption className="text-neutral-500">Active day</Caption>
            <View className="w-3 h-3 rounded-sm border border-neutral-300 dark:border-neutral-600 ml-3" />
            <Caption className="text-neutral-500">Inactive</Caption>
          </View>
        </Card>

        {/* ── Recent Quiz History ── */}
        <Card
          variant="bordered"
          className="mb-4 bg-white dark:bg-neutral-900"
        >
          <SectionHeader
            icon="history"
            title="Recent Activity"
            subtitle={`Last ${quizHistory.length} sessions`}
            color="#0284c7"
            highlighted={false}
          />

          {quizHistory.length > 0 ? (
            <View className="gap-2">
              {quizHistory.slice(0, 15).map((quiz) => (
                <View
                  key={quiz.id}
                  className="flex-row items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                >
                  <View className="flex-1 mr-3">
                    <BodyText className="text-sm font-medium" numberOfLines={1}>
                      {quiz.subject_name || "Quiz"}
                    </BodyText>
                    <Caption className="text-neutral-500 dark:text-neutral-400">
                      {quiz.quiz_type || "Quiz"} •{" "}
                      {quiz.completed_at ? formatDate(quiz.completed_at) : "—"}
                    </Caption>
                  </View>
                  <View className="items-end">
                    <Caption
                      style={{
                        color: scoreColor(Number(quiz.score ?? 0)),
                        fontWeight: "700",
                        fontSize: 14,
                      }}
                    >
                      {quiz.score != null
                        ? `${Math.round(Number(quiz.score))}%`
                        : "N/A"}
                    </Caption>
                    <Caption className="text-neutral-400">
                      {quiz.total_questions ?? 0}q
                    </Caption>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="items-center py-6">
              <MaterialIcons name="history" size={36} color="#a1a1aa" />
              <Caption className="text-neutral-400 mt-2">
                No activity yet
              </Caption>
            </View>
          )}
        </Card>

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}

