import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Heading, BodyText, Caption } from "@/components/Typography";
import { Button } from "@/components";
import api from "@/lib/api";

/**
 * Practice Quiz screen.
 *
 * Milestone 7: Wires the navigation flow and confirms the API handshake
 * (locates the subject's quiz, starts an attempt, receives attempt_id).
 * The full single-subject quiz player is built in Milestone 9.
 *
 * Navigation:
 *   /practice/new?subject_id=…&exam_type_id=…&year=…&limit=…&time=…&shuffle=…
 *   /practice/{attempt_id}  — resume an existing attempt (future)
 */
const PracticeQuizScreen = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    subject_id?: string;
    exam_type_id?: string;
    year?: string;
    limit?: string;
    time?: string;
    shuffle?: string;
  }>();

  const { id, ...queryParams } = params;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
  const [subjectName, setSubjectName] = useState<string>("");

  useEffect(() => {
    const startNewQuiz = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const subjectId = queryParams.subject_id;
        if (!subjectId) {
          throw new Error("Subject ID is missing.");
        }

        // 1. Find the quiz for this subject
        const quizzesResponse = await api.get("/quizzes", {
          params: { subject_id: subjectId },
        });
        const quizzes = quizzesResponse.data?.data ?? [];
        const quiz = quizzes[0];

        if (!quiz?.id) {
          throw new Error("No practice quiz found for this subject.");
        }

        setSubjectName(quiz.subject_name ?? quiz.name ?? "");

        // 2. Start the attempt — mirrors web's PracticeQuiz.php mount() which reads
        //    URL params and calls the quiz service to create/resume an attempt
        const startResponse = await api.post(`/quizzes/${quiz.id}/start`, {
          shuffle: queryParams.shuffle === "true",
          question_count: queryParams.limit ? Number(queryParams.limit) : undefined,
          time_limit: queryParams.time ? Number(queryParams.time) : undefined,
          exam_type_id: queryParams.exam_type_id
            ? Number(queryParams.exam_type_id)
            : undefined,
          year: queryParams.year ? Number(queryParams.year) : undefined,
        });

        const data = startResponse.data?.data;
        if (!data?.attempt_id) {
          throw new Error("Failed to initialise the quiz attempt.");
        }

        setAttemptId(data.attempt_id);
        setTotalQuestions(data.total_questions ?? null);
      } catch (e: any) {
        const message =
          e.response?.data?.message ?? e.message ?? "An unknown error occurred.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    const resumeQuiz = () => {
      // Resume flow: id is an existing attempt_id
      setAttemptId(Number(id));
      setIsLoading(false);
    };

    if (id === "new") {
      startNewQuiz();
    } else {
      resumeQuiz();
    }
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
        <BodyText className="mt-4 text-neutral-500 dark:text-neutral-400">
          Preparing your quiz...
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

  // ── M7 Shell — attempt created, quiz player coming in M9 ──────────────────

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
          <Heading size="lg">Practice Quiz</Heading>
        </View>
        <Caption className="text-neutral-500 dark:text-neutral-400 ml-12">
          Attempt #{attemptId} created
        </Caption>
      </View>

      {/* Body */}
      <View className="flex-1 px-5 pt-8 items-center">
        {/* Ready icon */}
        <View className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 items-center justify-center mb-6">
          <MaterialIcons name="menu-book" size={40} color="#ea580c" />
        </View>

        <Heading size="xl" className="mb-2 text-center">
          Quiz Ready!
        </Heading>
        <BodyText className="text-neutral-500 dark:text-neutral-400 text-center mb-8 px-4">
          Your practice session has been created. The full quiz player will be
          available in the next release (Milestone 9).
        </BodyText>

        {/* Settings summary */}
        <View className="w-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 mb-6">
          <Caption className="text-orange-600 dark:text-orange-400 font-semibold mb-3 uppercase tracking-wide">
            Session Details
          </Caption>

          {subjectName ? (
            <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
              <BodyText className="text-neutral-500 dark:text-neutral-400">Subject</BodyText>
              <BodyText className="font-semibold">{subjectName}</BodyText>
            </View>
          ) : null}

          <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
            <BodyText className="text-neutral-500 dark:text-neutral-400">Attempt ID</BodyText>
            <BodyText className="font-semibold text-primary-600 dark:text-primary-400">
              #{attemptId}
            </BodyText>
          </View>

          {totalQuestions ? (
            <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
              <BodyText className="text-neutral-500 dark:text-neutral-400">Questions</BodyText>
              <BodyText className="font-semibold">{totalQuestions}</BodyText>
            </View>
          ) : null}

          {queryParams.year ? (
            <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
              <BodyText className="text-neutral-500 dark:text-neutral-400">Year</BodyText>
              <BodyText className="font-semibold">{queryParams.year}</BodyText>
            </View>
          ) : null}

          <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
            <BodyText className="text-neutral-500 dark:text-neutral-400">Time Limit</BodyText>
            <BodyText className="font-semibold">
              {queryParams.time ? `${queryParams.time} min` : "Unlimited"}
            </BodyText>
          </View>

          <View className="flex-row justify-between py-2">
            <BodyText className="text-neutral-500 dark:text-neutral-400">Shuffle</BodyText>
            <BodyText className="font-semibold">
              {queryParams.shuffle === "true" ? "Yes" : "No"}
            </BodyText>
          </View>
        </View>

        <Button
          variant="outline"
          size="lg"
          fullWidth
          onPress={() => router.back()}
        >
          Back to Practice Setup
        </Button>
      </View>
    </View>
  );
};

export default PracticeQuizScreen;
