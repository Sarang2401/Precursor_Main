import { usePathname, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../config/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();

  useEffect(() => {
    // Skip redirect if we're already on a role-specific page (prevents issues on web refresh)
    if (pathname && (pathname.includes('/manufacturer') || pathname.includes('/driver') || pathname.includes('/regulator'))) {
      return;
    }

    // Auto-redirect to user's role-specific dashboard
    if (!loading && user?.role) {
      const roleRoutes: Record<string, string> = {
        manufacturer: '/(manufacturer)',
        driver: '/(driver)/dashboard',
        regulator: '/(regulator)/dashboard',
      };

      const route = roleRoutes[user.role];
      if (route) {
        router.replace(route);
      }
    }
  }, [user, loading, pathname]);


  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const goToDashboard = () => {
    const roleRoutes = {
      manufacturer: '/(manufacturer)',
      driver: '/(driver)/dashboard',
      regulator: '/(regulator)/dashboard',
    };

    if (user?.role && roleRoutes[user.role]) {
      router.push(roleRoutes[user.role]);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Show user their role info with logout option
  const roleInfo = {
    manufacturer: { icon: '👷', title: 'MANUFACTURER', color: '#059669', desc: 'Create & manage shipments' },
    driver: { icon: '🚚', title: 'DRIVER', color: '#2563EB', desc: 'Scan & transport shipments' },
    regulator: { icon: '🦺', title: 'REGULATOR', color: '#D97706', desc: 'Monitor & audit shipments' },
  };

  const currentRole = roleInfo[user?.role] || roleInfo.manufacturer;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pharma Track System</Text>
      <Text style={styles.subtitle}>Logged in as: {user?.username}</Text>

      <TouchableOpacity
        style={[styles.card, { borderColor: currentRole.color }]}
        onPress={goToDashboard}
      >
        <Text style={styles.icon}>{currentRole.icon}</Text>
        <Text style={styles.roleTitle}>{currentRole.title}</Text>
        <Text style={styles.roleDesc}>{currentRole.desc}</Text>
        <Text style={styles.tapHint}>Tap to go to dashboard</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 30
  },
  card: {
    width: 300,
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 24,
    borderWidth: 2,
    alignItems: 'center',
  },
  icon: { fontSize: 48, marginBottom: 8 },
  roleTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E40AF' },
  roleDesc: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  tapHint: { fontSize: 12, color: '#9CA3AF', marginTop: 12, fontStyle: 'italic' },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8
  },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
