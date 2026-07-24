import React, { useEffect, useState, useCallback } from "react";
import {
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Pressable,
  Modal as RNModal,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
  Heading,
  Subheading,
  BodyText,
  Caption,
} from "@/components/Typography";
import { Badge } from "@/components/Badge";
import { CardSkeleton } from "@/components/Skeleton";

// ─── Types ─────────────────────────────────────────────────
type ChildMetrics = {
  videos_watched: number;
  total_videos: number;
  videos_percentage: number;
  average_score: number;
  mock_exams_taken: number;
  best_mock_score: number;
  lessons_completed: number;
  lessons_started: number;
  lessons_percentage: number;
  time_spent_seconds: number;
  time_spent_formatted: string;
  video_views: number;
  video_watch_time_seconds: number;
  video_watch_time_formatted: string;
  video_completion_rate: number;
};

type Child = {
  id: number;
  name: string;
  email: string;
  has_completed_onboarding: boolean;
  email_verified: boolean;
  enrolled_subjects_count: number;
  has_active_subscription: boolean;
  parent_paid: boolean;
  can_view_metrics: boolean;
  access_label: string;
  metrics: ChildMetrics | null;
};

type CombinedStats = {
  children_count: number;
  paid_count: number;
  videos_watched: number;
  total_videos: number;
  quizzes_taken: number;
  total_quizzes: number;
  average_score: number;
  subjects_enrolled: number;
  mock_exams_taken: number;
  best_mock_score: number;
  lessons_completed: number;
  lessons_started: number;
  lessons_percentage: number;
  time_spent_seconds: number;
  time_spent_hours: number;
  total_video_views: number;
  total_video_watch_time_seconds: number;
  total_video_watch_time_hours: number;
  average_completion_rate: number;
};

type Subscription = {
  id: number;
  plan: string;
  amount: number;
  status: string;
  student_id: number | null;
  student_name: string | null;
  created_at: string;
  ends_at: string | null;
  is_expired: boolean;
  type: string;
};

type SubjectItem = {
  id: number;
  name: string;
  code: string;
  slug: string;
  is_enrolled: boolean;
};

type DashboardData = {
  stats: CombinedStats;
  children: Child[];
  subscriptions: Subscription[];
  unassigned_subscriptions: Subscription[];
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Progress Bar ────────────────────────────────────────
function ProgressBar({
  progress,
  color,
  bgColor,
}: {
  progress: number;
  color: string;
  bgColor: string;
}) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  return (
    <View
      className="h-2.5 rounded-full overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      <View
        className="h-full rounded-full"
        style={{
          width: `${clampedProgress}%`,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

// ─── Stat Card ───────────────────────────────────────────
function StatCard({
  icon,
  iconColor,
  iconBgLight,
  iconBgDark,
  label,
  value,
  isDark,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  iconBgLight: string;
  iconBgDark: string;
  label: string;
  value: string | number;
  isDark: boolean;
}) {
  return (
    <View
      className={`w-[48%] mb-3 rounded-2xl p-4 ${
        isDark
          ? "bg-neutral-900 border border-neutral-800"
          : "bg-white border border-neutral-100"
      }`}
      style={{
        shadowColor: isDark ? "#000" : "#94a3b8",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.3 : 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mb-3"
        style={{ backgroundColor: isDark ? iconBgDark : iconBgLight }}
      >
        <MaterialIcons name={icon} size={20} color={iconColor} />
      </View>
      <Text
        className={`text-2xl font-bold mb-0.5 ${
          isDark ? "text-white" : "text-neutral-900"
        }`}
      >
        {value}
      </Text>
      <Text
        className={`text-xs font-medium ${
          isDark ? "text-neutral-400" : "text-neutral-500"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Enrollment Modal ─────────────────────────────────────
function EnrollmentModal({
  visible,
  onClose,
  studentId,
  studentName,
  isDark,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  studentId: number;
  studentName: string;
  isDark: boolean;
  onSuccess: () => void;
}) {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSubjects();
    }
  }, [visible]);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/parent/students/${studentId}/subjects`);
      const data = res.data?.data ?? [];
      setSubjects(data);
      setSelectedIds(data.filter((s: SubjectItem) => s.is_enrolled).map((s: SubjectItem) => s.id));
    } catch (e) {
      console.warn("Failed to load subjects", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const saveEnrollment = async () => {
    setSaving(true);
    try {
      await api.post(`/parent/students/${studentId}/enrollment`, {
        subjects: selectedIds,
      });
      Alert.alert("Success", "Enrollment updated successfully.");
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e.response?.data?.message ?? "Failed to update enrollment."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ width: "100%", maxHeight: "80%" }}
        >
          <View
            className={`mx-4 rounded-t-3xl p-6 ${
              isDark ? "bg-neutral-900" : "bg-white"
            }`}
            style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
          >
            {/* Handle bar */}
            <View className="items-center mb-4">
              <View
                className={`w-10 h-1 rounded-full ${
                  isDark ? "bg-neutral-700" : "bg-neutral-300"
                }`}
              />
            </View>

            <Heading size="lg" className="mb-1">
              Manage Enrollment
            </Heading>
            <Caption className="mb-5">
              Select subjects for {studentName}
            </Caption>

            {loading ? (
              <ActivityIndicator size="large" color="#4f46e5" />
            ) : (
              <ScrollView
                style={{ maxHeight: 350 }}
                showsVerticalScrollIndicator={false}
              >
                {subjects.map((subject) => {
                  const selected = selectedIds.includes(subject.id);
                  return (
                    <TouchableOpacity
                      key={subject.id}
                      onPress={() => toggleSubject(subject.id)}
                      activeOpacity={0.7}
                      className={`flex-row items-center p-4 rounded-xl mb-2 border ${
                        selected
                          ? isDark
                            ? "bg-indigo-900/30 border-indigo-500"
                            : "bg-indigo-50 border-indigo-300"
                          : isDark
                          ? "bg-neutral-800/50 border-neutral-700"
                          : "bg-neutral-50 border-neutral-200"
                      }`}
                    >
                      <View
                        className={`w-6 h-6 rounded-md items-center justify-center mr-3 ${
                          selected
                            ? "bg-indigo-500"
                            : isDark
                            ? "bg-neutral-700"
                            : "bg-neutral-200"
                        }`}
                      >
                        {selected && (
                          <MaterialIcons name="check" size={16} color="#fff" />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`font-medium ${
                            isDark ? "text-white" : "text-neutral-900"
                          }`}
                        >
                          {subject.name}
                        </Text>
                        {subject.code ? (
                          <Text
                            className={`text-xs mt-0.5 ${
                              isDark ? "text-neutral-400" : "text-neutral-500"
                            }`}
                          >
                            {subject.code}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View className="flex-row gap-3 mt-5">
              <View className="flex-1">
                <Button variant="outline" fullWidth onPress={onClose}>
                  Cancel
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  variant="primary"
                  fullWidth
                  loading={saving}
                  onPress={saveEnrollment}
                >
                  Save
                </Button>
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

// ─── Main Component ─────────────────────────────────────
export default function ParentDashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);

  // Link student form
  const [linkEmail, setLinkEmail] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);

  // Create student form
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Resend invitation loading
  const [resendingId, setResendingId] = useState<number | null>(null);

  // Enrollment modal
  const [enrollmentModal, setEnrollmentModal] = useState<{
    visible: boolean;
    studentId: number;
    studentName: string;
  }>({ visible: false, studentId: 0, studentName: "" });

  const loadDashboard = useCallback(async () => {
    try {
      const res = await api.get("/parent/dashboard");
      setData(res.data?.data ?? null);
    } catch (e: any) {
      console.warn("Failed to load parent dashboard", e);
      if (e.response?.status === 403) {
        Alert.alert("Access Denied", "Parent account required.");
      }
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadDashboard();
      setIsLoading(false);
    };
    init();
  }, [loadDashboard]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboard();
    setIsRefreshing(false);
  };

  const handleLinkStudent = async () => {
    if (!linkEmail.trim()) return;
    setLinkLoading(true);
    try {
      await api.post("/parent/students/link", { email: linkEmail.trim() });
      Alert.alert("Success", "Student linked successfully!");
      setLinkEmail("");
      setShowLinkForm(false);
      await loadDashboard();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e.response?.data?.message ?? "Failed to link student."
      );
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCreateStudent = async () => {
    if (!createName.trim() || !createEmail.trim()) return;
    setCreateLoading(true);
    try {
      await api.post("/parent/students/create", {
        name: createName.trim(),
        email: createEmail.trim(),
      });
      Alert.alert("Success", "Student created and invitation sent!");
      setCreateName("");
      setCreateEmail("");
      setShowCreateForm(false);
      await loadDashboard();
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join("\n")
        : e.response?.data?.message ?? "Failed to create student.";
      Alert.alert("Error", msg);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleResendInvitation = async (studentId: number) => {
    setResendingId(studentId);
    try {
      const res = await api.post(
        `/parent/students/${studentId}/resend-invitation`
      );
      Alert.alert("Sent", res.data?.message ?? "Invitation resent.");
    } catch (e: any) {
      Alert.alert(
        "Error",
        e.response?.data?.message ?? "Failed to resend invitation."
      );
    } finally {
      setResendingId(null);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ─── RENDER ────────────────────────────────────────
  if (isLoading) {
    return (
      <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <View className="pt-16 pb-6 px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <View className="w-48 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-800 mb-2" />
          <View className="w-64 h-4 rounded bg-neutral-200 dark:bg-neutral-800" />
        </View>
        <View className="px-4 pt-4">
          <View className="flex-row flex-wrap justify-between">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </View>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </View>
    );
  }

  const stats = data?.stats;
  const children = data?.children ?? [];
  const subscriptions = data?.subscriptions ?? [];

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* ─── Header ─── */}
      <View
        className="pt-16 pb-6 px-6"
        style={{
          backgroundColor: isDark ? "#0f0f23" : "#f0eef8",
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text
              className="text-sm font-medium mb-1"
              style={{ color: isDark ? "#a5b4fc" : "#6366f1" }}
            >
              Welcome back
            </Text>
            <Text
              className="text-2xl font-bold"
              style={{ color: isDark ? "#fff" : "#1e1b4b" }}
            >
              {user?.name ?? "Guardian"}
            </Text>
          </View>
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center"
            style={{
              backgroundColor: isDark ? "#312e81" : "#e0e7ff",
            }}
          >
            <MaterialIcons
              name="family-restroom"
              size={24}
              color={isDark ? "#a5b4fc" : "#4f46e5"}
            />
          </View>
        </View>

        {/* Mini stats row */}
        <View className="flex-row mt-5 gap-3">
          <View
            className="flex-1 rounded-xl p-3 items-center"
            style={{
              backgroundColor: isDark
                ? "rgba(99,102,241,0.15)"
                : "rgba(99,102,241,0.1)",
            }}
          >
            <Text
              className="text-lg font-bold"
              style={{ color: isDark ? "#a5b4fc" : "#4f46e5" }}
            >
              {stats?.children_count ?? 0}
            </Text>
            <Text
              className="text-xs"
              style={{ color: isDark ? "#818cf8" : "#6366f1" }}
            >
              Students
            </Text>
          </View>
          <View
            className="flex-1 rounded-xl p-3 items-center"
            style={{
              backgroundColor: isDark
                ? "rgba(16,185,129,0.15)"
                : "rgba(16,185,129,0.1)",
            }}
          >
            <Text
              className="text-lg font-bold"
              style={{ color: isDark ? "#6ee7b7" : "#059669" }}
            >
              {stats?.average_score ?? 0}%
            </Text>
            <Text
              className="text-xs"
              style={{ color: isDark ? "#34d399" : "#10b981" }}
            >
              Avg Score
            </Text>
          </View>
          <View
            className="flex-1 rounded-xl p-3 items-center"
            style={{
              backgroundColor: isDark
                ? "rgba(249,115,22,0.15)"
                : "rgba(249,115,22,0.1)",
            }}
          >
            <Text
              className="text-lg font-bold"
              style={{ color: isDark ? "#fdba74" : "#ea580c" }}
            >
              {stats?.mock_exams_taken ?? 0}
            </Text>
            <Text
              className="text-xs"
              style={{ color: isDark ? "#fb923c" : "#f97316" }}
            >
              Mock Exams
            </Text>
          </View>
        </View>
      </View>

      {/* ─── Scrollable Content ─── */}
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
        {/* ─── Stats Grid ─── */}
        <Subheading size="md" className="mb-3 px-1">
          Overview
        </Subheading>
        <View className="flex-row flex-wrap justify-between">
          <StatCard
            icon="play-circle"
            iconColor="#8b5cf6"
            iconBgLight="#ede9fe"
            iconBgDark="rgba(139,92,246,0.15)"
            label="Videos Watched"
            value={stats?.videos_watched ?? 0}
            isDark={isDark}
          />
          <StatCard
            icon="school"
            iconColor="#0ea5e9"
            iconBgLight="#e0f2fe"
            iconBgDark="rgba(14,165,233,0.15)"
            label="Lessons Done"
            value={stats?.lessons_completed ?? 0}
            isDark={isDark}
          />
          <StatCard
            icon="quiz"
            iconColor="#f59e0b"
            iconBgLight="#fef3c7"
            iconBgDark="rgba(245,158,11,0.15)"
            label="Quizzes Taken"
            value={stats?.quizzes_taken ?? 0}
            isDark={isDark}
          />
          <StatCard
            icon="schedule"
            iconColor="#10b981"
            iconBgLight="#d1fae5"
            iconBgDark="rgba(16,185,129,0.15)"
            label="Time Spent"
            value={`${stats?.time_spent_hours ?? 0}h`}
            isDark={isDark}
          />
        </View>

        {/* ─── Student Cards ─── */}
        <View className="flex-row items-center justify-between mt-4 mb-3 px-1">
          <Subheading size="md">
            My Students
          </Subheading>
          <Caption>{children.length} linked</Caption>
        </View>

        {children.length === 0 ? (
          <Card variant="bordered" className="items-center py-8">
            <MaterialIcons
              name="person-add"
              size={40}
              color={isDark ? "#6366f1" : "#4f46e5"}
            />
            <BodyText className="mt-3 text-center">
              No students linked yet.
            </BodyText>
            <Caption className="text-center mt-1">
              Link or create a student account below.
            </Caption>
          </Card>
        ) : (
          children.map((child) => (
            <View
              key={child.id}
              className={`mb-4 rounded-2xl overflow-hidden border ${
                isDark ? "border-neutral-800 bg-neutral-900" : "border-neutral-100 bg-white"
              }`}
              style={{
                shadowColor: isDark ? "#000" : "#94a3b8",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.3 : 0.06,
                shadowRadius: 10,
                elevation: 3,
              }}
            >
              {/* Student Header */}
              <View className="p-4 pb-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(99,102,241,0.15)"
                          : "#eef2ff",
                      }}
                    >
                      <Text
                        className="text-lg font-bold"
                        style={{
                          color: isDark ? "#a5b4fc" : "#4f46e5",
                        }}
                      >
                        {child.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-base font-semibold ${
                          isDark ? "text-white" : "text-neutral-900"
                        }`}
                        numberOfLines={1}
                      >
                        {child.name}
                      </Text>
                      <Text
                        className={`text-xs mt-0.5 ${
                          isDark ? "text-neutral-400" : "text-neutral-500"
                        }`}
                        numberOfLines={1}
                      >
                        {child.email}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    {/* Setup status */}
                    <View
                      className={`px-2.5 py-1 rounded-full ${
                        child.has_completed_onboarding
                          ? isDark
                            ? "bg-green-900/30"
                            : "bg-green-50"
                          : isDark
                          ? "bg-amber-900/30"
                          : "bg-amber-50"
                      }`}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{
                          color: child.has_completed_onboarding
                            ? isDark
                              ? "#6ee7b7"
                              : "#16a34a"
                            : isDark
                            ? "#fbbf24"
                            : "#d97706",
                        }}
                      >
                        {child.has_completed_onboarding
                          ? "Ready"
                          : "Setup Needed"}
                      </Text>
                    </View>
                    {/* Subscription */}
                    <View
                      className={`px-2.5 py-1 rounded-full ${
                        child.parent_paid
                          ? isDark
                            ? "bg-indigo-900/30"
                            : "bg-indigo-50"
                          : isDark
                          ? "bg-neutral-800"
                          : "bg-neutral-100"
                      }`}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{
                          color: child.parent_paid
                            ? isDark
                              ? "#a5b4fc"
                              : "#4f46e5"
                            : isDark
                            ? "#71717a"
                            : "#a1a1aa",
                        }}
                      >
                        {child.access_label}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Resend Invitation */}
                {!child.has_completed_onboarding && (
                  <TouchableOpacity
                    onPress={() => handleResendInvitation(child.id)}
                    disabled={resendingId === child.id}
                    activeOpacity={0.7}
                    className={`mt-3 flex-row items-center justify-center p-2.5 rounded-xl ${
                      isDark
                        ? "bg-amber-900/20 border border-amber-800/40"
                        : "bg-amber-50 border border-amber-200"
                    }`}
                  >
                    {resendingId === child.id ? (
                      <ActivityIndicator size="small" color="#d97706" />
                    ) : (
                      <>
                        <MaterialIcons
                          name="email"
                          size={16}
                          color={isDark ? "#fbbf24" : "#d97706"}
                        />
                        <Text
                          className="text-xs font-medium ml-1.5"
                          style={{
                            color: isDark ? "#fbbf24" : "#d97706",
                          }}
                        >
                          Resend Invitation
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Metrics Section */}
              {child.can_view_metrics && child.metrics ? (
                <View
                  className={`px-4 py-3 ${
                    isDark ? "bg-neutral-800/40" : "bg-neutral-50"
                  }`}
                >
                  {/* Videos progress */}
                  <View className="mb-3">
                    <View className="flex-row items-center justify-between mb-1.5">
                      <Text
                        className={`text-xs font-medium ${
                          isDark ? "text-neutral-300" : "text-neutral-600"
                        }`}
                      >
                        Videos
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-neutral-400" : "text-neutral-500"
                        }`}
                      >
                        {child.metrics.videos_watched}/
                        {child.metrics.total_videos}
                      </Text>
                    </View>
                    <ProgressBar
                      progress={child.metrics.videos_percentage}
                      color="#8b5cf6"
                      bgColor={isDark ? "#1e1b4b" : "#ede9fe"}
                    />
                  </View>

                  {/* Lessons progress */}
                  <View className="mb-3">
                    <View className="flex-row items-center justify-between mb-1.5">
                      <Text
                        className={`text-xs font-medium ${
                          isDark ? "text-neutral-300" : "text-neutral-600"
                        }`}
                      >
                        Lessons
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-neutral-400" : "text-neutral-500"
                        }`}
                      >
                        {child.metrics.lessons_completed}/
                        {child.metrics.lessons_started}
                      </Text>
                    </View>
                    <ProgressBar
                      progress={child.metrics.lessons_percentage}
                      color="#0ea5e9"
                      bgColor={isDark ? "#0c1a2e" : "#e0f2fe"}
                    />
                  </View>

                  {/* Mini stat row */}
                  <View className="flex-row justify-between mt-1">
                    <View className="items-center flex-1">
                      <Text
                        className={`text-base font-bold ${
                          isDark ? "text-white" : "text-neutral-900"
                        }`}
                      >
                        {Math.round(child.metrics.average_score)}%
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-neutral-400" : "text-neutral-500"
                        }`}
                      >
                        Avg Score
                      </Text>
                    </View>
                    <View
                      className={`w-px ${
                        isDark ? "bg-neutral-700" : "bg-neutral-200"
                      }`}
                    />
                    <View className="items-center flex-1">
                      <Text
                        className={`text-base font-bold ${
                          isDark ? "text-white" : "text-neutral-900"
                        }`}
                      >
                        {child.metrics.time_spent_formatted}
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-neutral-400" : "text-neutral-500"
                        }`}
                      >
                        Study Time
                      </Text>
                    </View>
                    <View
                      className={`w-px ${
                        isDark ? "bg-neutral-700" : "bg-neutral-200"
                      }`}
                    />
                    <View className="items-center flex-1">
                      <Text
                        className={`text-base font-bold ${
                          isDark ? "text-white" : "text-neutral-900"
                        }`}
                      >
                        {child.metrics.mock_exams_taken}
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-neutral-400" : "text-neutral-500"
                        }`}
                      >
                        Mock Exams
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                !child.can_view_metrics && (
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: "/pricing", params: { studentId: child.id } })}
                    activeOpacity={0.7}
                    className={`px-4 py-4 items-center ${
                      isDark ? "bg-neutral-800/40" : "bg-neutral-50"
                    }`}
                  >
                    <MaterialIcons
                      name="lock"
                      size={20}
                      color={isDark ? "#525252" : "#d4d4d4"}
                    />
                    <Text
                      className={`text-xs mt-1 ${
                        isDark ? "text-neutral-500" : "text-neutral-400"
                      }`}
                    >
                      Subscribe to view progress metrics
                    </Text>
                  </TouchableOpacity>
                )
              )}

              {/* Action Buttons */}
              <View
                className={`flex-row gap-2 p-4 pt-3 border-t ${
                  isDark ? "border-neutral-800" : "border-neutral-100"
                }`}
              >
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/parent/student-analytics",
                      params: {
                        studentId: child.id,
                        studentName: child.name,
                      },
                    })
                  }
                  activeOpacity={0.7}
                  disabled={!child.can_view_metrics}
                  className={`flex-1 flex-row items-center justify-center p-3 rounded-xl ${
                    child.can_view_metrics
                      ? isDark
                        ? "bg-indigo-900/30"
                        : "bg-indigo-50"
                      : "opacity-40"
                  }`}
                  style={
                    !child.can_view_metrics
                      ? {
                          backgroundColor: isDark ? "#1c1c1c" : "#f5f5f5",
                        }
                      : undefined
                  }
                >
                  <MaterialIcons
                    name="analytics"
                    size={16}
                    color={
                      child.can_view_metrics
                        ? isDark
                          ? "#a5b4fc"
                          : "#4f46e5"
                        : isDark
                        ? "#525252"
                        : "#d4d4d4"
                    }
                  />
                  <Text
                    className="text-xs font-medium ml-1.5"
                    style={{
                      color: child.can_view_metrics
                        ? isDark
                          ? "#a5b4fc"
                          : "#4f46e5"
                        : isDark
                        ? "#525252"
                        : "#d4d4d4",
                    }}
                  >
                    Track Progress
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    setEnrollmentModal({
                      visible: true,
                      studentId: child.id,
                      studentName: child.name,
                    })
                  }
                  activeOpacity={0.7}
                  className={`flex-1 flex-row items-center justify-center p-3 rounded-xl ${
                    isDark ? "bg-emerald-900/20" : "bg-emerald-50"
                  }`}
                >
                  <MaterialIcons
                    name="edit-note"
                    size={16}
                    color={isDark ? "#6ee7b7" : "#059669"}
                  />
                  <Text
                    className="text-xs font-medium ml-1.5"
                    style={{ color: isDark ? "#6ee7b7" : "#059669" }}
                  >
                    Enrollment
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* ─── Link / Create Student Actions ─── */}
        <View className="mt-2 mb-3 px-1">
          <Subheading size="md">Add Students</Subheading>
        </View>

        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity
            onPress={() => {
              setShowLinkForm(!showLinkForm);
              setShowCreateForm(false);
            }}
            activeOpacity={0.7}
            className="flex-1"
          >
            <View
              className={`rounded-2xl p-4 items-center border ${
                showLinkForm
                  ? isDark
                    ? "bg-indigo-900/20 border-indigo-500/50"
                    : "bg-indigo-50 border-indigo-200"
                  : isDark
                  ? "bg-neutral-900 border-neutral-800"
                  : "bg-white border-neutral-100"
              }`}
              style={{
                shadowColor: isDark ? "#000" : "#94a3b8",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mb-2"
                style={{
                  backgroundColor: isDark
                    ? "rgba(99,102,241,0.15)"
                    : "#eef2ff",
                }}
              >
                <MaterialIcons
                  name="person-add"
                  size={20}
                  color={isDark ? "#a5b4fc" : "#4f46e5"}
                />
              </View>
              <Text
                className={`text-sm font-semibold ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                Link Existing
              </Text>
              <Text
                className={`text-xs mt-0.5 text-center ${
                  isDark ? "text-neutral-400" : "text-neutral-500"
                }`}
              >
                By email address
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setShowCreateForm(!showCreateForm);
              setShowLinkForm(false);
            }}
            activeOpacity={0.7}
            className="flex-1"
          >
            <View
              className={`rounded-2xl p-4 items-center border ${
                showCreateForm
                  ? isDark
                    ? "bg-emerald-900/20 border-emerald-500/50"
                    : "bg-emerald-50 border-emerald-200"
                  : isDark
                  ? "bg-neutral-900 border-neutral-800"
                  : "bg-white border-neutral-100"
              }`}
              style={{
                shadowColor: isDark ? "#000" : "#94a3b8",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mb-2"
                style={{
                  backgroundColor: isDark
                    ? "rgba(16,185,129,0.15)"
                    : "#d1fae5",
                }}
              >
                <MaterialIcons
                  name="group-add"
                  size={20}
                  color={isDark ? "#6ee7b7" : "#059669"}
                />
              </View>
              <Text
                className={`text-sm font-semibold ${
                  isDark ? "text-white" : "text-neutral-900"
                }`}
              >
                Create New
              </Text>
              <Text
                className={`text-xs mt-0.5 text-center ${
                  isDark ? "text-neutral-400" : "text-neutral-500"
                }`}
              >
                New student account
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Link Form */}
        {showLinkForm && (
          <Card variant="bordered" className="mb-4">
            <Subheading size="sm" className="mb-3">
              Link Existing Student
            </Subheading>
            <Input
              label="Student Email"
              placeholder="student@example.com"
              value={linkEmail}
              onChangeText={setLinkEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button
              variant="primary"
              fullWidth
              loading={linkLoading}
              onPress={handleLinkStudent}
            >
              Link Student
            </Button>
          </Card>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <Card variant="bordered" className="mb-4">
            <Subheading size="sm" className="mb-3">
              Create New Student Account
            </Subheading>
            <Input
              label="Full Name"
              placeholder="Student's full name"
              value={createName}
              onChangeText={setCreateName}
              autoCapitalize="words"
            />
            <Input
              label="Email Address"
              placeholder="student@example.com"
              value={createEmail}
              onChangeText={setCreateEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button
              variant="primary"
              fullWidth
              loading={createLoading}
              onPress={handleCreateStudent}
            >
              Create & Send Invitation
            </Button>
          </Card>
        )}

        {/* ─── Subscriptions ─── */}
        {subscriptions.length > 0 && (
          <>
            <View className="flex-row items-center justify-between mt-4 mb-3 px-1">
              <Subheading size="md">
                Subscriptions
              </Subheading>
              <Caption>{subscriptions.length} active</Caption>
            </View>

            {subscriptions.map((sub) => (
              <Card
                key={sub.id}
                variant="bordered"
                className="mb-3"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <View
                      className="w-9 h-9 rounded-lg items-center justify-center mr-3"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(16,185,129,0.15)"
                          : "#d1fae5",
                      }}
                    >
                      <MaterialIcons
                        name="card-membership"
                        size={18}
                        color={isDark ? "#6ee7b7" : "#059669"}
                      />
                    </View>
                    <View>
                      <Text
                        className={`text-sm font-semibold ${
                          isDark ? "text-white" : "text-neutral-900"
                        }`}
                      >
                        {sub.plan ?? "Standard"} Plan
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-neutral-400" : "text-neutral-500"
                        }`}
                      >
                        {sub.student_name
                          ? `For ${sub.student_name}`
                          : "Unassigned"}
                      </Text>
                    </View>
                  </View>
                  <View
                    className={`px-2.5 py-1 rounded-full ${
                      sub.is_expired
                        ? isDark
                          ? "bg-red-900/30"
                          : "bg-red-50"
                        : sub.status === "active"
                        ? isDark
                          ? "bg-green-900/30"
                          : "bg-green-50"
                        : isDark
                        ? "bg-amber-900/30"
                        : "bg-amber-50"
                    }`}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{
                        color: sub.is_expired
                          ? isDark
                            ? "#fca5a5"
                            : "#dc2626"
                          : sub.status === "active"
                          ? isDark
                            ? "#6ee7b7"
                            : "#16a34a"
                          : isDark
                          ? "#fbbf24"
                          : "#d97706",
                      }}
                    >
                      {sub.is_expired
                        ? "Expired"
                        : sub.status === "active"
                        ? "Active"
                        : "Pending"}
                    </Text>
                  </View>
                </View>

                <View
                  className={`flex-row items-center justify-between pt-2 border-t ${
                    isDark ? "border-neutral-800" : "border-neutral-100"
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      isDark ? "text-neutral-500" : "text-neutral-400"
                    }`}
                  >
                    Since {formatDate(sub.created_at)}
                  </Text>
                  {sub.ends_at && (
                    <Text
                      className={`text-xs ${
                        isDark ? "text-neutral-500" : "text-neutral-400"
                      }`}
                    >
                      Expires {formatDate(sub.ends_at)}
                    </Text>
                  )}
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Bottom spacer */}
        <View className="h-12" />
      </ScrollView>

      {/* ─── Enrollment Modal ─── */}
      <EnrollmentModal
        visible={enrollmentModal.visible}
        onClose={() =>
          setEnrollmentModal({ visible: false, studentId: 0, studentName: "" })
        }
        studentId={enrollmentModal.studentId}
        studentName={enrollmentModal.studentName}
        isDark={isDark}
        onSuccess={loadDashboard}
      />
    </View>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
});
