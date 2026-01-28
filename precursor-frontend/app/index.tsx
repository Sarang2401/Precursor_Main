import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../config/AuthContext';

export default function Index() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!isAuthenticated()) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
