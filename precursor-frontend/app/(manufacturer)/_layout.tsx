import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";

export default function ManufacturerLayout() {
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
        headerTintColor: "#059669",
        headerShadowVisible: true,
        contentStyle: {
          backgroundColor: "#F9FAFB",
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Manufacturer Dashboard",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create-shipment"
        options={{
          title: "Create Shipment",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="show-qr"
        options={{
          title: "Shipment QR Code",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
