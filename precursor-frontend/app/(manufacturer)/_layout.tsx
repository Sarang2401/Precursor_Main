import { Stack } from 'expo-router';

export default function ManufacturerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="create-shipment" />
      <Stack.Screen name="show-qr" />
    </Stack>
  );
}