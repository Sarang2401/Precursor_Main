import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(manufacturer)" />
      <Stack.Screen name="(driver)" />
      <Stack.Screen name="(regulator)" />
      <Stack.Screen name="(debug)" />
    </Stack>
  );
}
