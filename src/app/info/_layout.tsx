import React from 'react';
import { Stack } from 'expo-router';

export default function InfoLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="about" options={{ headerShown: false }} />
      <Stack.Screen name="help-center" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
    </Stack>
  );
}
