import React, { useState, useEffect } from "react";
import {
  Alert,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Card, Button } from "@/components";
import {
  Heading,
  Subheading,
  BodyText,
  Caption,
} from "@/components/Typography";
import api from "@/lib/api";
import { downloadMissingSubjects } from "@/lib/offlineDownload";

type Subject = {
  id: number;
  name: string;
};

type Year = {
  year: number | string;
  label: string;
};

function normalizeYears(input: unknown): Year[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (typeof item === "number" || typeof item === "string") {
        return {
          year: item,
          label: String(item),
        };
      }

      if (item && typeof item === "object") {
        const maybeYear = (item as { year?: number | string }).year;
        const maybeLabel = (item as { label?: string }).label;

        if (maybeYear !== undefined) {
          return {
            year: maybeYear,
            label: maybeLabel ?? String(maybeYear),
          };
        }
      }

      return null;
    })
    .filter((item): item is Year => Boolean(item));
}

function toNumericYear(selectedYear: Year | null): number | undefined {
  if (!selectedYear || selectedYear.year === "random") {
    return undefined;
  }

  const parsedYear = Number(selectedYear.year);

  return Number.isFinite(parsedYear) ? parsedYear : undefined;
}

export default function PracticeSetupScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);
  const [isTimed, setIsTimed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareStatus, setPrepareStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [subjectsRes, yearsRes] = await Promise.all([
          api.get("/config/subjects"),
          api.get("/config/years"),
        ]);

        const fetchedSubjects: Subject[] =
          subjectsRes.data?.data ?? subjectsRes.data ?? [];
        const fetchedYears = normalizeYears(
          yearsRes.data?.data ?? yearsRes.data ?? [],
        );

        setSubjects(fetchedSubjects);
        setYears([{ year: "random", label: "Random" }, ...fetchedYears]);

        if (fetchedSubjects.length > 0) {
          setSelectedSubject(fetchedSubjects[0]);
        }
        setSelectedYear({ year: "random", label: "Random" });
      } catch (e) {
        setError("Could not load configuration. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const startPracticeSession = async () => {
    if (!selectedSubject) {
      return;
    }

    try {
      setIsPreparing(true);
      setPrepareStatus("Checking offline availability...");
      const selectedYearForDownload = toNumericYear(selectedYear);

      const { downloadedNow } = await downloadMissingSubjects(
        [
          {
            id: selectedSubject.id,
            name: selectedSubject.name,
          },
        ],
        {
          year: selectedYearForDownload,
          onProgress: (progress) => {
            if (progress.phase === "checking") {
              setPrepareStatus(`Checking ${progress.subjectName}...`);
            }

            if (progress.phase === "downloading") {
              setPrepareStatus(`Downloading ${progress.subjectName}...`);
            }

            if (
              progress.phase === "page" &&
              progress.currentPage &&
              progress.lastPage
            ) {
              setPrepareStatus(
                `Downloading ${progress.subjectName}: page ${progress.currentPage}/${progress.lastPage}`,
              );
            }
          },
        },
      );

      setPrepareStatus("Starting practice session...");

      const quizzesResponse = await api.get("/quizzes", {
        params: {
          subject_id: selectedSubject.id,
        },
      });

      const quizzes = quizzesResponse.data?.data ?? [];

      if (!Array.isArray(quizzes) || quizzes.length === 0) {
        Alert.alert(
          "No quiz available",
          "No practice quiz is currently available for this subject.",
        );

        return;
      }

      const quizId = quizzes[0]?.id;

      if (!quizId) {
        Alert.alert(
          "Could not start",
          "Quiz could not be initialized right now. Please try again.",
        );

        return;
      }

      const startResponse = await api.post(`/quizzes/${quizId}/start`, {
        shuffle: isTimed,
      });

      const attemptId = startResponse.data?.data?.attempt_id;

      if (downloadedNow.length > 0) {
        Alert.alert(
          "Practice started",
          `${selectedSubject.name} is ready. ${downloadedNow.length} subject pack downloaded.${attemptId ? ` Attempt #${attemptId} created.` : ""}`,
        );
      } else {
        Alert.alert(
          "Practice started",
          `${selectedSubject.name} is ready offline.${attemptId ? ` Attempt #${attemptId} created.` : ""}`,
        );
      }
    } catch (downloadError) {
      const message =
        downloadError instanceof Error
          ? downloadError.message
          : "Could not prepare subject download. Please try again.";

      Alert.alert("Preparation failed", message);
    } finally {
      setIsPreparing(false);
      setPrepareStatus(null);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
        <BodyText className="mt-4 text-neutral-500">
          Loading options...
        </BodyText>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-8">
        <MaterialIcons name="cloud-off" size={48} color="#a1a1aa" />
        <BodyText className="mt-4 text-center text-neutral-500">
          {error}
        </BodyText>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View className="pt-16 pb-6 px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <Heading size="xl" className="mb-2">
          Practice Mode
        </Heading>
        <BodyText className="text-neutral-900 dark:text-neutral-400">
          Focus on specific subjects and past questions to sharpen your skills
          at your own pace.
        </BodyText>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Subject Selection */}
        <Subheading size="md" className="mb-3 px-2">
          Select Subject
        </Subheading>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-8 pl-2"
        >
          {subjects.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              activeOpacity={0.7}
              onPress={() => setSelectedSubject(subject)}
              className={`mr-3 px-5 py-3 rounded-full border-2 ${
                selectedSubject?.id === subject.id
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
                  : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
              }`}
            >
              <BodyText
                className={`font-medium ${selectedSubject?.id === subject.id ? "text-primary-600 dark:text-primary-400" : ""}`}
              >
                {subject.name}
              </BodyText>
            </TouchableOpacity>
          ))}
          <View className="w-4" />
        </ScrollView>

        {/* Year Selection */}
        <Subheading size="md" className="mb-3 px-2">
          Select Year
        </Subheading>
        <View className="flex-row flex-wrap px-2 mb-6">
          {years.map((y) => (
            <Button
              key={String(y.year)}
              onPress={() => setSelectedYear(y)}
              variant={selectedYear?.year === y.year ? "primary" : "outline"}
              size="sm"
              style={{ marginRight: 12, marginBottom: 12 }}
            >
              {y.label ?? String(y.year)}
            </Button>
          ))}
        </View>

        {years.length === 0 ? (
          <Card
            variant="bordered"
            padding="md"
            className="mb-6 bg-white dark:bg-neutral-900"
          >
            <Caption className="text-neutral-500 dark:text-neutral-400">
              No exam years found. You can still continue with Random year.
            </Caption>
          </Card>
        ) : null}

        {/* Practice Options */}
        <Subheading size="md" className="mb-3 px-2">
          Options
        </Subheading>
        <Card
          variant="bordered"
          padding="md"
          className="mb-24 bg-white dark:bg-neutral-900"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-4">
              <View className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center mr-3">
                <MaterialIcons
                  name="timer"
                  size={20}
                  color={isDark ? "#a1a1aa" : "#52525b"}
                />
              </View>
              <View>
                <BodyText className="font-semibold mb-1">Timed Mode</BodyText>
                <Caption className="text-neutral-900">
                  Practice under exam pressure
                </Caption>
              </View>
            </View>
            <Switch
              value={isTimed}
              onValueChange={setIsTimed}
              trackColor={{
                false: isDark ? "#3f3f46" : "#e4e4e7",
                true: "#4f46e5",
              }}
            />
          </View>
        </Card>
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-lg border-t border-neutral-200 dark:border-neutral-800">
        {isPreparing && prepareStatus ? (
          <View className="flex-row items-center mb-3">
            <ActivityIndicator size="small" color="#4f46e5" />
            <Caption className="ml-2 text-neutral-700 dark:text-neutral-300">
              {prepareStatus}
            </Caption>
          </View>
        ) : null}

        <Button
          onPress={startPracticeSession}
          size="lg"
          loading={isPreparing}
          disabled={!selectedSubject || isPreparing}
          fullWidth
        >
          Start Practice Session
        </Button>
      </View>
    </View>
  );
}
