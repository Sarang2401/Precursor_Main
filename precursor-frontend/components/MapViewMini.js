import { StyleSheet, Text, View } from 'react-native';
// For real map, use react-native-maps

export default function MapViewMini({ route }) {
  // 'route' is an array of { name, lat, lng, type }
  // For demo, just show point names
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Route Map</Text>
      <View style={styles.routeList}>
        {route.map((r, idx) => (
          <Text key={r.name} style={{
            color: r.type === 'current' ? '#10B981' : (r.type === 'diverted' ? '#F59E0B' : '#1E40AF'),
            fontWeight: r.type === 'current' ? 'bold' : 'normal'
          }}>
            {r.name} {r.type === 'current' ? '(Current)' : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor:"#E0F2FE", borderRadius:8, padding:16, marginBottom:14 },
  title: { fontSize: 13, fontWeight: 'bold', color: "#0369A1", marginBottom: 5 },
  routeList: { }
});
