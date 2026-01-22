import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";

export default function DriverLayout() {
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
        headerTintColor: "#2563EB",
        headerShadowVisible: true,
        contentStyle: {
          backgroundColor: "#F9FAFB",
        },
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{
          title: "Driver Dashboard",
          headerLeft: () => (
            <Ionicons name="car" size={24} color="#2563EB" style={{ marginRight: 10 }} />
          ),
        }}
      />
      <Stack.Screen
        name="scan-shipment"
        options={{
          title: "Scan Shipment",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="gps-hops"
        options={{ title: "GPS Tracking" }}
      />
      <Stack.Screen
        name="shipment-control"
        options={{ title: "Shipment Control" }}
      />
      <Stack.Screen
        name="tamper"
        options={{ title: "Tamper Detection" }}
      />
    </Stack>
  );
}
