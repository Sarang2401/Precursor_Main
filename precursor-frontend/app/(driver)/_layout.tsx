import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="gps-hops" />
      <Stack.Screen name="scan-shipment" />
      <Stack.Screen name="shipment-control" />
      <Stack.Screen name="tamper" />
    </Stack>
  );
}