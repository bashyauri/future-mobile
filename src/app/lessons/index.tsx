import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

import { useTheme } from "@/context/ThemeContext";
import { Heading, BodyText, Caption } from "@/components/Typography";
import { Button } from "@/components";
import api from "@/lib/api";

interface Lesson {
  id: number;
  title: string;
  description: string;
  duration_seconds: number;
  thumbnail_url: string;
  order: number;
  is_completed: boolean;
  progress_percentage: number;
  current_time_seconds: number;
  time_spent_seconds: number;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  slug: string;
}

interface SubjectWithLessons {
  subject: Subject;
  lessons: Lesson[];
  lessonCount: number;
}

export default function LessonsScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [showAllSubjects, setShowAllSubjects] = useState(!subjectId);

  const loadLessons = async () => {
    try {
      if (!subjectId) {
        setShowAllSubjects(true);
        return;
      }

      const response = await api.get("/lessons", {
        params: { subject_id: subjectId },
      });

      const data = response.data?.data ?? response.data;
      setLessons(data);

      // Get subject info from first lesson or fetch separately
      if (data.length > 0) {
        const lessonResponse = await api.get(`/lessons/${data[0].id}`);
        const lessonData = lessonResponse.data?.data ?? lessonResponse.data;
        setSubject(lessonData.subject);
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? e?.message ?? "Failed to load lessons",
      );
    }
  };

  const loadAllSubjects = async () => {
    try {
      const response = await api.get("/subjects");
      const data = response.data?.data ?? response.data;
      setAllSubjects(data);
    } catch (e: any) {
      console.error("Failed to load subjects:", e);
    }
  };

  useEffect(() => {
    const initLessons = async () => {
      setIsLoading(true);
      await loadAllSubjects();
      await loadLessons();
      setIsLoading(false);
    };
    initLessons();
  }, [subjectId]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadAllSubjects();
    await loadLessons();
    setIsRefreshing(false);
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleLessonClick = (lessonId: number) => {
    router.push(`/lessons/${lessonId}`);
  };

  const handleSubjectSelect = (selectedSubjectId: number) => {
    router.push(`/lessons?subjectId=${selectedSubjectId}`);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
        <BodyText className="mt-4 text-neutral-500">Loading lessons...</BodyText>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
        <MaterialIcons name="error-outline" size={48} color="#ef4444" />
        <BodyText className="mt-4 text-center text-neutral-700 dark:text-neutral-300">
          {error}
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

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View
        className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800"
        style={{ paddingTop: insets.top + 16, paddingBottom: 16, paddingHorizontal: 16 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={isDark ? "#f5f5f5" : "#171717"}
            />
          </TouchableOpacity>
          <View className="flex-1">
            <Heading size="lg">{subject?.name || "All Lessons"}</Heading>
            <Caption className="text-neutral-500 dark:text-neutral-400">
              {subject ? `${lessons.length} lessons` : `${allSubjects.length} subjects`}
            </Caption>
          </View>
          {subject && (
            <TouchableOpacity onPress={() => router.push("/lessons")} style={{ marginLeft: 12 }}>
              <MaterialIcons
                name="grid-view"
                size={24}
                color={isDark ? "#f5f5f5" : "#171717"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#4f46e5"
          />
        }
      >
        {showAllSubjects ? (
          // Show all subjects
          <>
            {allSubjects.length === 0 ? (
              <View className="items-center justify-center py-16">
                <MaterialIcons
                  name="video-library"
                  size={48}
                  color="#9ca3af"
                />
                <BodyText className="mt-4 text-neutral-500 dark:text-neutral-400">
                  No subjects available
                </BodyText>
              </View>
            ) : (
              <View className="gap-3">
                {allSubjects.map((subj) => (
                  <TouchableOpacity
                    key={subj.id}
                    onPress={() => handleSubjectSelect(subj.id)}
                    className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <BodyText className="font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                          {subj.name}
                        </BodyText>
                        <Caption className="text-neutral-500 dark:text-neutral-400">
                          {subj.code || ''}
                        </Caption>
                      </View>
                      <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color="#9ca3af"
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        ) : (
          // Show lessons for specific subject
          <>
            {lessons.length === 0 ? (
              <View className="items-center justify-center py-16">
                <MaterialIcons
                  name="video-library"
                  size={48}
                  color="#9ca3af"
                />
                <BodyText className="mt-4 text-neutral-500 dark:text-neutral-400">
                  No lessons available for this subject
                </BodyText>
              </View>
            ) : (
              lessons.map((lesson) => (
                <TouchableOpacity
                  key={lesson.id}
                  onPress={() => handleLessonClick(lesson.id)}
                  className="bg-white dark:bg-neutral-900 rounded-xl p-4 mb-3 border border-neutral-200 dark:border-neutral-800"
                >
                  <View className="flex-row">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <BodyText className="font-bold text-neutral-900 dark:text-neutral-100 flex-1">
                          {lesson.order}. {lesson.title}
                        </BodyText>
                        {lesson.is_completed && (
                          <MaterialIcons name="check-circle" size={20} color="#22c55e" />
                        )}
                      </View>
                      <Caption className="text-neutral-500 dark:text-neutral-400 mb-2">
                        {lesson.description}
                      </Caption>
                      <View className="flex-row items-center">
                        <MaterialIcons
                          name="schedule"
                          size={14}
                          color="#9ca3af"
                        />
                        <Caption className="text-neutral-500 dark:text-neutral-400 ml-1">
                          {formatDuration(lesson.duration_seconds)}
                        </Caption>
                        {lesson.progress_percentage > 0 && !lesson.is_completed && (
                          <>
                            <Caption className="text-neutral-500 dark:text-neutral-400 mx-2">
                              •
                            </Caption>
                            <Caption className="text-primary-600 dark:text-primary-400">
                              {lesson.progress_percentage}% complete
                            </Caption>
                          </>
                        )}
                      </View>
                    </View>
                    <MaterialIcons
                      name="play-circle-outline"
                      size={32}
                      color={lesson.is_completed ? "#22c55e" : "#4f46e5"}
                      style={{ marginLeft: 12 }}
                    />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
