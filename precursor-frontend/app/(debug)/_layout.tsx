import { Stack } from "expo-router";
export default function DebugLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="panel"
        options={{ title: "Debug Panel" }}
      />
    </Stack>
  );
}