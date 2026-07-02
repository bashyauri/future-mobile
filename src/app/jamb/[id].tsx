import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Heading, BodyText, Caption } from "@/components/Typography";
import { Button } from "@/components";

/**
 * Milestone 7 shell — confirms routing is wired correctly.
 * The full multi-subject JAMB quiz player will be built in Milestone 9.
 */
export default function JambQuizScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  const params = useLocalSearchParams<{
    id: string;
    subjects?: string;
    year?: string;
    questionsPerSubject?: string;
    timeLimit?: string;
    shuffle?: string;
  }>();

  const subjectIds = (params.subjects ?? "").split(",").filter(Boolean);
  const year = params.year ?? null;
  const questionsPerSubject = params.questionsPerSubject ?? "40";
  const timeLimit = params.timeLimit ? `${params.timeLimit} min` : "Unlimited";
  const shuffle = params.shuffle === "1" ? "Yes" : "No";

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View className="pt-14 pb-5 px-5 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <View className="flex-row items-center mb-3">
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
          <Heading size="lg">JAMB Exam</Heading>
        </View>
        <Caption className="text-neutral-500 dark:text-neutral-400">
          Session ready · {subjectIds.length} subject{subjectIds.length !== 1 ? "s" : ""} selected
        </Caption>
      </View>

      {/* Body — session summary */}
      <View className="flex-1 px-5 pt-8 items-center">
        {/* Ready icon */}
        <View className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 items-center justify-center mb-6">
          <MaterialIcons name="auto-stories" size={40} color="#4f46e5" />
        </View>

        <Heading size="xl" className="mb-2 text-center">
          JAMB Session Ready
        </Heading>
        <BodyText className="text-neutral-500 dark:text-neutral-400 text-center mb-8 px-4">
          Your settings have been validated. The full JAMB quiz player will be
          available in the next release.
        </BodyText>

        {/* Settings summary card */}
        <View className="w-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 mb-6">
          <Caption className="text-primary-600 dark:text-primary-400 font-semibold mb-3 uppercase tracking-wide">
            Session Settings
          </Caption>

          <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
            <BodyText className="text-neutral-500 dark:text-neutral-400">Subjects</BodyText>
            <BodyText className="font-semibold">{subjectIds.length} selected</BodyText>
          </View>

          <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
            <BodyText className="text-neutral-500 dark:text-neutral-400">Year</BodyText>
            <BodyText className="font-semibold">{year ?? "All Years"}</BodyText>
          </View>

          <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
            <BodyText className="text-neutral-500 dark:text-neutral-400">Questions / Subject</BodyText>
            <BodyText className="font-semibold">{questionsPerSubject}</BodyText>
          </View>

          <View className="flex-row justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
            <BodyText className="text-neutral-500 dark:text-neutral-400">Time Limit</BodyText>
            <BodyText className="font-semibold">{timeLimit}</BodyText>
          </View>

          <View className="flex-row justify-between py-2">
            <BodyText className="text-neutral-500 dark:text-neutral-400">Shuffle</BodyText>
            <BodyText className="font-semibold">{shuffle}</BodyText>
          </View>
        </View>

        <View className="w-full gap-3">
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => router.back()}
          >
            Back to Setup
          </Button>
        </View>
      </View>
    </View>
  );
}
