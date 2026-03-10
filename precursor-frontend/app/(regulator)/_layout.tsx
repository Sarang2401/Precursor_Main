import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";

export default function RegulatorLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#fff",
        },
        headerTitleStyle: {
          fontWeight: "bold",
          color: "#111827",
        },
        headerTintColor: "#D97706",
        headerShadowVisible: true,
        contentStyle: {
          backgroundColor: "#F9FAFB",
        },
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{
          title: "Regulator Dashboard",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="alerts"
        options={{
          title: "ML Alerts",
        }}
      />
      <Stack.Screen
        name="audit-trail"
        options={{
          title: "Audit Trail",
        }}
      />
    </Stack>
  );
}
