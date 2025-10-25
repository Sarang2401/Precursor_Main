import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function DriverDashboardScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🚚 Driver Dashboard</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Active Shipment</Text>
        <Text style={styles.cardText}>Shipment ID: SHP-10293</Text>
        <Text style={styles.cardText}>Destination: Pune Pharma Center</Text>
        <Text style={styles.cardText}>Status: In Transit</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#43A047" }]}
        onPress={() => router.push("/(driver)/scanner")}
      >
        <Text style={styles.buttonText}>📷 Scan QR at Checkpoint</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#1976D2" }]}
        onPress={() => router.push("/(driver)/gps-tracker")}
      >
        <Text style={styles.buttonText}>📍 View Live GPS Tracker</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#F57C00" }]}
        onPress={() => router.push("/(driver)/control")}
      >
        <Text style={styles.buttonText}>⚙️ Shipment Controls</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#C62828" }]}
        onPress={() => router.replace("/")}
      >
        <Text style={styles.buttonText}>← Back to Role Selection</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F9FAFB",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1565C0",
    marginBottom: 20,
  },
  card: {
    width: "90%",
    backgroundColor: "#E3F2FD",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#0D47A1",
  },
  cardText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  button: {
    width: "90%",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 8,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
