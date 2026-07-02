import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Heading, BodyText, Caption } from "@/components/Typography";
import { Button } from "@/components";
import { storage } from "@/lib/storage";

type SubjectInfo = {
  id: number;
  name: string;
  total_groups?: number;
  time_limit_minutes?: number;
};

type SessionData = {
  session_id?: string;
  mock_session_id?: string;
  exam_type?: { id: number; name: string; slug: string };
  subjects?: SubjectInfo[];
  duration_minutes?: number;
  total_questions?: number;
};

/**
 * Mock Quiz screen.
 *
 * Milestone 7: Reads the session data stored by mock-setup, confirms the
 * routing is wired correctly, and displays the session summary.
 * The full mock exam player (timer, anti-cheat, per-subject navigation)
 * will be built in Milestone 10.
 *
 * Navigation: /mock/{session_id}
 */
export default function MockQuizScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        if (!id) {
          throw new Error("No mock session ID provided.");
        }

        // Read the session data saved by mock-setup before navigation
        const raw = await storage.getItem(`mock_session_${id}`);
        if (raw) {
          setSession(JSON.parse(raw));
        } else {
          // Fallback: show the session ID alone if storage read misses
          setSession({ session_id: id });
        }
      } catch (e: any) {
        setError(e.message ?? "Failed to load mock session.");
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [id]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
        <BodyText className="mt-4 text-neutral-500 dark:text-neutral-400">
          Loading your mock exam...
        </BodyText>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

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

  // ── M7 Shell — session loaded, mock player coming in M10 ─────────────────

  const subjects = session?.subjects ?? [];
  const examTypeName = session?.exam_type?.name ?? "Mock Exam";
  const totalQuestions = session?.total_questions ?? "—";
  const durationMinutes = session?.duration_minutes ?? "—";
  const sessionId = session?.session_id ?? session?.mock_session_id ?? id;

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View className="pt-14 pb-5 px-5 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <View className="flex-row items-center mb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 w-9 h-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
          >
            <MaterialIcons
              name="arrow-back"
              size={20}
              color={isDark ? "#fafafa" : "#171717"}
            />
          </TouchableOpacity>
          <Heading size="lg">{examTypeName}</Heading>
        </View>
        <Caption className="text-neutral-500 dark:text-neutral-400 ml-12">
          Session · {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
        </Caption>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-8"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Ready icon */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mb-6">
            <MaterialIcons name="timer" size={40} color="#7c3aed" />
          </View>

          <Heading size="xl" className="mb-2 text-center">
            Mock Session Ready
          </Heading>
          <BodyText className="text-neutral-500 dark:text-neutral-400 text-center px-4">
            Your session has been created securely. The full mock exam player
            (timer, anti-cheat) will be available in the next release
            (Milestone 10).
          </BodyText>
        </View>

        {/* Summary card */}
        <View className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 mb-4">
          <Caption className="text-purple-600 dark:text-purple-400 font-semibold mb-3 uppercase tracking-wide">
            Session Summary
          </Caption>

          <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
            <BodyText className="text-neutral-500 dark:text-neutral-400">Session ID</BodyText>
            <Caption className="font-mono text-neutral-600 dark:text-neutral-400 text-xs">
              {String(sessionId).slice(0, 8)}…
            </Caption>
          </View>

          <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
            <BodyText className="text-neutral-500 dark:text-neutral-400">Exam Type</BodyText>
            <BodyText className="font-semibold">{examTypeName}</BodyText>
          </View>

          <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
            <BodyText className="text-neutral-500 dark:text-neutral-400">Subjects</BodyText>
            <BodyText className="font-semibold">{subjects.length} selected</BodyText>
          </View>

          <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
            <BodyText className="text-neutral-500 dark:text-neutral-400">Total Questions</BodyText>
            <BodyText className="font-semibold">{totalQuestions}</BodyText>
          </View>

          <View className="flex-row justify-between py-2">
            <BodyText className="text-neutral-500 dark:text-neutral-400">Duration</BodyText>
            <BodyText className="font-semibold">
              {durationMinutes !== "—" ? `${durationMinutes} min` : "—"}
            </BodyText>
          </View>
        </View>

        {/* Per-subject breakdown */}
        {subjects.length > 0 && (
          <View className="mb-4">
            <Caption className="text-neutral-500 dark:text-neutral-400 font-semibold mb-2 px-1 uppercase tracking-wide">
              Subjects
            </Caption>
            {subjects.map((subject) => (
              <View
                key={subject.id}
                className="flex-row items-center justify-between bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3 mb-2"
              >
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mr-3">
                    <MaterialIcons name="book" size={16} color="#7c3aed" />
                  </View>
                  <BodyText className="font-medium">{subject.name}</BodyText>
                </View>
                {subject.time_limit_minutes ? (
                  <Caption className="text-neutral-500 dark:text-neutral-400">
                    {subject.time_limit_minutes} min
                  </Caption>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom action */}
      <View className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-white/90 dark:bg-neutral-950/90 border-t border-neutral-200 dark:border-neutral-800">
        <Button
          variant="outline"
          size="lg"
          fullWidth
          onPress={() => router.replace("/(tabs)/mock-setup")}
        >
          Back to Mock Setup
        </Button>
      </View>
    </View>
  );
}
