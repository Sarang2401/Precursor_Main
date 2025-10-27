import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Home screen */}
      <Stack.Screen name="index" />
      
      {/* Tab navigation (your existing tabs) */}
      <Stack.Screen name="(tabs)" />
      
      {/* Manufacturer screens */}
      <Stack.Screen name="(manufacturer)" />
      
      {/* Driver screens */}
      <Stack.Screen name="(driver)" />
      
      {/* Regulator screens */}
      <Stack.Screen name="(regulator)" />
      
      {/* Debug screens (if you have them) */}
      <Stack.Screen name="(debug)" />
    </Stack>
  );
}