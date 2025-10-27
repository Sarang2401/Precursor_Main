import { Stack } from 'expo-router';

export default function RegulatorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="alerts" />
      <Stack.Screen name="audit-trail" />
    </Stack>
  );
}