import { Stack } from "expo-router";
import { AuthProvider } from "../config/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(manufacturer)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen name="(regulator)" />
        <Stack.Screen name="(debug)" />
      </Stack>
    </AuthProvider>
  );
}
