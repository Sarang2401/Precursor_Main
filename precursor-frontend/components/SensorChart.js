import { StyleSheet, Text, View } from 'react-native';

export default function SensorChart({ data, title, unit }) {
  // 'data' is an array [{ value, timestamp }, ...]
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {/* For real charts, use 'react-native-svg' or chart libs. Below is a simple line. */}
      <View style={styles.chart}>
        {/* Simulated inline values, e.g. */}
        {data.map((d, i) => (
          <View key={i} style={{ left: i * 28, bottom: d.value, position: 'absolute' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" }} />
            <Text style={{ fontSize: 10 }}>{d.value}{unit}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  title: { fontSize: 14, fontWeight: "bold", color: "#111827", marginBottom: 8 },
  chart: { height: 70, backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, position: "relative" }
});
