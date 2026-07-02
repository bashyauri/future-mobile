import { Stack } from "expo-router";
import React from "react";

const MockLayout = () => {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
};

export default MockLayout;
