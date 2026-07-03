import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@/context/ThemeContext";
import { Heading, BodyText, Caption } from "@/components/Typography";
import { Button } from "@/components";
import api from "@/lib/api";
import { storage } from "@/lib/storage";

const PracticeQuizScreen = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [attemptId, setAttemptId] = useState<number | null>(
    null,
  );

  const [totalQuestions, setTotalQuestions] = useState<number | null>(
    null,
  );

  const [timeLimit, setTimeLimit] = useState<number | null>(
    null,
  );

  const [currentQuestionIndex, setCurrentQuestionIndex] =
    useState(0);

  useEffect(() => {
    const loadAttempt = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try cache first
        const cached = await storage.getItem(
          `practice_attempt_${id}`,
        );

        if (cached) {
          const parsed = JSON.parse(cached);

          setAttemptId(parsed.attempt_id ?? Number(id));
          setTotalQuestions(parsed.total_questions ?? null);
          setTimeLimit(parsed.time_limit ?? null);
        }

        // Always refresh from server
        const response = await api.get(
          `/practice/load/${id}`,
        );

        const data =
  response.data?.data ?? response.data;
  if (!data?.attempt_id) {
  throw new Error(
    "Practice attempt could not be loaded.",
  );
}

        setAttemptId(data.attempt_id);
        setTotalQuestions(data.total_questions ?? null);
        setTimeLimit(data.time_limit ?? null);
        setCurrentQuestionIndex(
          data.current_question_index ?? 0,
        );

        await storage.setItem(
          `practice_attempt_${id}`,
          JSON.stringify(data),
        );
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
  }, [id]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator
          size="large"
          color="#4f46e5"
        />
        <BodyText className="mt-4 text-neutral-500 dark:text-neutral-400">
          Loading practice session...
        </BodyText>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-8">
        <MaterialIcons
          name="error-outline"
          size={48}
          color="#ef4444"
        />

        <BodyText className="mt-4 text-center text-red-500">
          {error}
        </BodyText>

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

          <Heading size="lg">
            Practice Quiz
          </Heading>
        </View>

        <Caption className="text-neutral-500 dark:text-neutral-400 ml-12">
          Attempt #{attemptId}
        </Caption>
      </View>

      {/* Placeholder until full quiz player is built */}

      <View className="flex-1 px-5 pt-8 items-center">
        <View className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 items-center justify-center mb-6">
          <MaterialIcons
            name="menu-book"
            size={40}
            color="#ea580c"
          />
        </View>

        <Heading
          size="xl"
          className="mb-2 text-center"
        >
          Practice Session Loaded
        </Heading>

        <BodyText className="text-neutral-500 dark:text-neutral-400 text-center mb-8 px-4">
          Practice attempt successfully loaded from the
          Practice API.
        </BodyText>

        <View className="w-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 mb-6">
          <Caption className="text-orange-600 dark:text-orange-400 font-semibold mb-3 uppercase tracking-wide">
            Session Details
          </Caption>

          <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
            <BodyText className="text-neutral-500 dark:text-neutral-400">
              Attempt ID
            </BodyText>

            <BodyText className="font-semibold text-primary-600 dark:text-primary-400">
              #{attemptId}
            </BodyText>
          </View>

          <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
            <BodyText className="text-neutral-500 dark:text-neutral-400">
              Questions
            </BodyText>

            <BodyText className="font-semibold">
              {totalQuestions ?? "-"}
            </BodyText>
          </View>

          <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
            <BodyText className="text-neutral-500 dark:text-neutral-400">
              Current Position
            </BodyText>

            <BodyText className="font-semibold">
              {currentQuestionIndex + 1}
            </BodyText>
          </View>

          <View className="flex-row justify-between py-2">
            <BodyText className="text-neutral-500 dark:text-neutral-400">
              Time Limit
            </BodyText>

            <BodyText className="font-semibold">
              {timeLimit
                ? `${timeLimit} min`
                : "Unlimited"}
            </BodyText>
          </View>
        </View>

        <Button
          size="lg"
          fullWidth
          onPress={() => {
            // Next milestone:
            // render actual quiz player
          }}
        >
          Continue
        </Button>
      </View>
    </View>
  );
};

export default PracticeQuizScreen;