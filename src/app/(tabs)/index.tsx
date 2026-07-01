import React, { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import api from "@/lib/api";
import { Card } from "@/components";
import {
  BodyText,
  Caption,
  Heading,
  Subheading,
} from "@/components/Typography";

type Subject = {
  id: number;
  name: string;
  code?: string;
};

export default function HomeScreen() {
  const router = useRouter();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const loadDashboard = async (): Promise<void> => {
    const response = await api.get("/subjects");
    const subjectList: Subject[] = response.data?.data ?? response.data ?? [];

    setSubjects(subjectList);
  };

  useEffect(() => {
    loadDashboard().catch((error) => {
      console.warn("Failed to load home dashboard", error);
    });
  }, []);

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

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
