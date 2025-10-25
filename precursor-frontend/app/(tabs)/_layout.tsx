import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false,
          title: 'PRECURSOR'
        }} 
      />
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="(manufacturer)/dashboard" 
        options={{ 
          title: 'Manufacturer Dashboard',
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="(manufacturer)/create-shipment" 
        options={{ 
          title: 'Create Shipment',
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="(manufacturer)/show-qr" 
        options={{ 
          title: 'Shipment QR Code'
        }} 
      />
      <Stack.Screen 
        name="(driver)/dashboard" 
        options={{ 
          title: 'Driver Dashboard',
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="(driver)/gps-hops" 
        options={{ 
          title: 'GPS Tracker'
        }} 
      />
      <Stack.Screen 
        name="(driver)/scan-shipment" 
        options={{ 
          title: 'Scan Checkpoint'
        }} 
      />
      <Stack.Screen 
        name="(driver)/shipment-control" 
        options={{ 
          title: 'Shipment Control'
        }} 
      />
      <Stack.Screen 
        name="(driver)/tamper" 
        options={{ 
          title: 'Report Issue'
        }} 
      />
      <Stack.Screen 
        name="(regulator)/dashboard" 
        options={{ 
          title: 'Regulator Dashboard',
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="(regulator)/alerts" 
        options={{ 
          title: 'Active Alerts'
        }} 
      />
      <Stack.Screen 
        name="(regulator)/audit-trail" 
        options={{ 
          title: 'Audit Trail'
        }} 
      />
    </Stack>
  );
}